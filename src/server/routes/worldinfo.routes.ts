import { errorGuard } from '@/server/middleware/errorGuard';
import { worldInfoService } from '@/server/services/worldinfo.service';
import type { WorldInfo, WorldInfoEntry } from '@/shared/types/worldinfo';

export const worldinfoRoutes = {
  create: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { name: string; entries: WorldInfoEntry[] };
    const fileId = await worldInfoService.create(body.name, body.entries);
    return Response.json({ ok: true, id: fileId });
  }),

  get: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json().catch(() => ({}))) as { fileId: number };
    const result = await worldInfoService.get(body.fileId);
    return Response.json(result);
  }),

  all: errorGuard(async (_req: Request): Promise<Response> => {
    const result = await worldInfoService.getAll();
    return Response.json(result);
  }),

  update: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { fileId: number; data: Partial<WorldInfo> };
    await worldInfoService.update(body.fileId, body.data);
    return Response.json({ ok: true });
  }),

  delete: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { fileId: number };
    await worldInfoService.delete(body.fileId);
    return Response.json({ ok: true });
  }),

  addEntry: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { fileId: number; entry: WorldInfoEntry };
    await worldInfoService.addEntry(body.fileId, body.entry);
    return Response.json({ ok: true });
  }),

  updateEntry: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { fileId: number; uid: string; entry: WorldInfoEntry };
    await worldInfoService.updateEntry(body.fileId, body.uid, body.entry);
    return Response.json({ ok: true });
  }),

  deleteEntry: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { fileId: number; uid: string };
    await worldInfoService.deleteEntry(body.fileId, body.uid);
    return Response.json({ ok: true });
  }),

  import: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { jsonPath: string };
    const fileId = await worldInfoService.importWi(body.jsonPath);
    return Response.json({ ok: true, id: fileId });
  }),

  export: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { fileId: number };
    const result = await worldInfoService.exportWi(body.fileId);
    return new Response(result.data as unknown as Blob, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
      },
    });
  }),
};
