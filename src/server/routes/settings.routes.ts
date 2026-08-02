import { errorGuard } from '@/server/middleware/errorGuard';
import { withUserId } from '@/server/middleware/withUserId';
import { settingsService } from '@/server/services/settings.service';

export const settingsRoutes = {
  save: errorGuard(
    withUserId(async (req: Request, _userId: string): Promise<Response> => {
      const body = (await req.json()) as Record<string, unknown>;
      await settingsService.save(body);
      return Response.json({ ok: true });
    }),
  ),

  get: errorGuard(
    withUserId(async (_req: Request, _userId: string): Promise<Response> => {
      const result = await settingsService.get();
      return Response.json(result);
    }),
  ),

  getSnapshots: errorGuard(
    withUserId(async (_req: Request, _userId: string): Promise<Response> => {
      const snapshots = await settingsService.getSnapshots();
      return Response.json(snapshots);
    }),
  ),

  loadSnapshot: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id: string };
      const data = await settingsService.loadSnapshot(body.id, userId);
      return Response.json(data);
    }),
  ),

  makeSnapshot: errorGuard(
    withUserId(async (req: Request, _userId: string): Promise<Response> => {
      const body = (await req.json()) as { name: string };
      const id = await settingsService.makeSnapshot(body.name);
      return Response.json({ ok: true, id });
    }),
  ),

  restoreSnapshot: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id: string };
      await settingsService.restoreSnapshot(body.id, userId);
      return Response.json({ ok: true });
    }),
  ),
};
