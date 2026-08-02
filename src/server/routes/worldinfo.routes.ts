import { errorGuard } from '@/server/middleware/errorGuard';
import { withUserId } from '@/server/middleware/withUserId';
import { worldInfoService } from '@/server/services/worldinfo.service';
import type { WorldInfo, WorldInfoEntry } from '@/shared/types/worldinfo';

export const worldinfoRoutes = {
  create: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { name: string; entries: WorldInfoEntry[] };
      const fileId = await worldInfoService.create(body.name, body.entries, userId);
      return Response.json({ ok: true, id: fileId });
    }),
  ),

  get: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json().catch(() => ({}))) as { fileId: number };
      const result = await worldInfoService.get(body.fileId, userId);
      return Response.json(result);
    }),
  ),

  all: errorGuard(
    withUserId(async (_req: Request, userId: string): Promise<Response> => {
      const result = await worldInfoService.getAll(userId);
      return Response.json(result);
    }),
  ),

  update: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { fileId: number; data: Partial<WorldInfo> };
      await worldInfoService.update(body.fileId, body.data, userId);
      return Response.json({ ok: true });
    }),
  ),

  delete: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { fileId: number };
      await worldInfoService.delete(body.fileId, userId);
      return Response.json({ ok: true });
    }),
  ),

  addEntry: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { fileId: number; entry: WorldInfoEntry };
      await worldInfoService.addEntry(body.fileId, body.entry, userId);
      return Response.json({ ok: true });
    }),
  ),

  updateEntry: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { fileId: number; uid: string; entry: WorldInfoEntry };
      await worldInfoService.updateEntry(body.fileId, body.uid, body.entry, userId);
      return Response.json({ ok: true });
    }),
  ),

  deleteEntry: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { fileId: number; uid: string };
      await worldInfoService.deleteEntry(body.fileId, body.uid, userId);
      return Response.json({ ok: true });
    }),
  ),

  import: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { jsonPath: string };
      const fileId = await worldInfoService.importWi(body.jsonPath, userId);
      return Response.json({ ok: true, id: fileId });
    }),
  ),

  export: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { fileId: number };
      const result = await worldInfoService.exportWi(body.fileId, userId);
      return new Response(result.data as unknown as Blob, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${result.fileName}"`,
        },
      });
    }),
  ),
};
