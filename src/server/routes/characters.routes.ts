import { errorGuard } from '@/server/middleware/errorGuard';
import { withUserId } from '@/server/middleware/withUserId';
import { characterService } from '@/server/services/character.service';
import { importCharacter } from '@/server/importers/character.importer';
import { exportCharacter, type ExportFormat } from '@/server/exporters/character.exporter';
import { characterFolderService } from '@/server/services/character-folder.service';
import { getUserCharacterPath } from '@/server/storage/paths';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { CharacterCreateInput } from '@/shared/types/character';

export const characterRoutes = {
  create: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as CharacterCreateInput;
      const result = await characterService.create(body, userId);
      return Response.json({ ok: true, id: result.id });
    }),
  ),

  rename: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id: number; newName: string };
      await characterService.rename(body.id, userId, body.newName);
      return Response.json({ ok: true });
    }),
  ),

  edit: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id: number; data: Record<string, unknown> };
      await characterService.edit(body.id, userId, body.data);
      return Response.json({ ok: true });
    }),
  ),

  editAvatar: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id: number; avatar: string };
      let avatarData: string | Buffer;
      if (body.avatar.startsWith('data:image/')) {
        const base64Data = body.avatar.split(',')[1];
        avatarData = Buffer.from(base64Data!, 'base64');
      } else {
        avatarData = body.avatar;
      }
      await characterService.editAvatar(body.id, userId, avatarData);
      return Response.json({ ok: true });
    }),
  ),

  bindPersona: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id: number; personaId: number | null };
      await characterService.bindPersona(body.id, userId, body.personaId);
      return Response.json({ ok: true });
    }),
  ),

  getAvatar: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const url = new URL(req.url);
      const id = Number(url.searchParams.get('id'));
      if (!id) {
        return Response.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Missing id parameter' } },
          { status: 400 },
        );
      }
      const char = await characterService.get(id, userId);
      if (!char) {
        return Response.json(
          { error: { code: 'NOT_FOUND', message: 'Character not found' } },
          { status: 404 },
        );
      }
      const avatarPath = path.join(getUserCharacterPath(userId), char.avatar);
      const file = Bun.file(avatarPath);
      if (!(await file.exists())) {
        return Response.json(
          { error: { code: 'NOT_FOUND', message: 'Avatar not found' } },
          { status: 404 },
        );
      }
      return new Response(file.stream(), {
        headers: { 'Content-Type': 'image/png' },
      });
    }),
  ),

  getThumbnail: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const url = new URL(req.url);
      const id = Number(url.searchParams.get('id'));
      if (!id) {
        return Response.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Missing id parameter' } },
          { status: 400 },
        );
      }
      const thumbPath = await characterService.getThumbnailPath(id, userId);
      if (!thumbPath) {
        return Response.json(
          { error: { code: 'NOT_FOUND', message: 'Character thumbnail not found' } },
          { status: 404 },
        );
      }
      const file = Bun.file(thumbPath);
      if (!(await file.exists())) {
        return Response.json(
          { error: { code: 'NOT_FOUND', message: 'Character thumbnail not found' } },
          { status: 404 },
        );
      }
      return new Response(file.stream(), {
        headers: { 'Content-Type': 'image/png' },
      });
    }),
  ),

  editAttribute: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as {
        id: number;
        field: string;
        value: string | string[] | boolean | number;
      };
      await characterService.editAttribute(body.id, userId, body.field, body.value);
      return Response.json({ ok: true });
    }),
  ),

  mergeAttributes: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id: number; attrs: Record<string, unknown> };
      await characterService.mergeAttributes(body.id, userId, body.attrs);
      return Response.json({ ok: true });
    }),
  ),

  delete: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id: number };
      await characterService.delete(body.id, userId);
      return Response.json({ ok: true });
    }),
  ),

  all: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json().catch(() => ({}))) as { shallow?: boolean };
      const result = await characterService.getAll(userId, body.shallow);
      return Response.json(result);
    }),
  ),

  get: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json().catch(() => ({}))) as { id: number };
      const result = await characterService.get(body.id, userId);
      return Response.json(result);
    }),
  ),

  chats: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json().catch(() => ({}))) as { fileName: string };
      const result = await characterService.getChats(body.fileName, userId);
      return Response.json(result);
    }),
  ),

  duplicate: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id: number };
      const newId = await characterService.duplicate(body.id, userId);
      return Response.json({ ok: true, id: newId });
    }),
  ),

  import: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const formData = await req.formData();
      const file = formData.get('file');

      if (!file || !(file instanceof File)) {
        return Response.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Missing file' } },
          { status: 400 },
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const tempPath = `/tmp/WorldCore_import_${Date.now()}_${randomUUID()}`;
      await Bun.write(tempPath, buffer);

      const id = await importCharacter(tempPath, file.name, userId);
      return Response.json({ ok: true, id });
    }),
  ),

  export: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id: number; format: ExportFormat };
      const result = await exportCharacter(body.id, userId, body.format);
      return new Response(result.data as unknown as Blob, {
        headers: {
          'Content-Type': result.mimeType,
          'Content-Disposition': `attachment; filename="${result.fileName}"`,
        },
      });
    }),
  ),

  reconcileList: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      await req.json().catch(() => ({}));
      const orphans = await characterFolderService.listOrphans(userId);
      return Response.json({ orphans });
    }),
  ),

  reconcileDelete: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json().catch(() => ({}))) as { paths?: unknown };
      if (!Array.isArray(body.paths) || !body.paths.every((p) => typeof p === 'string')) {
        return Response.json(
          { error: { code: 'VALIDATION_ERROR', message: 'paths must be an array' } },
          { status: 400 },
        );
      }
      const result = await characterFolderService.deleteOrphans(userId, body.paths);
      return Response.json(result);
    }),
  ),
};
