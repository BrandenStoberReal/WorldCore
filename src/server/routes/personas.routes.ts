import { errorGuard } from '@/server/middleware/errorGuard';
import { withUserId } from '@/server/middleware/withUserId';
import { personaService } from '@/server/services/persona.service';
import type { PersonaCreateInput, PersonaEditInput } from '@/shared/types/persona';

export const personaRoutes = {
  create: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as PersonaCreateInput;
      const result = await personaService.create(body, userId);
      return Response.json({ ok: true, id: result.id });
    }),
  ),

  edit: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id: number } & PersonaEditInput;
      const { id, ...patch } = body;
      await personaService.edit(id, userId, patch);
      return Response.json({ ok: true });
    }),
  ),

  rename: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id: number; name: string };
      await personaService.rename(body.id, userId, body.name);
      return Response.json({ ok: true });
    }),
  ),

  setDefault: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id: number };
      await personaService.setDefault(body.id, userId);
      return Response.json({ ok: true });
    }),
  ),

  setAvatar: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id: number; avatar: string };
      await personaService.setAvatar(body.id, userId, body.avatar);
      return Response.json({ ok: true });
    }),
  ),

  delete: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id: number };
      await personaService.delete(body.id, userId);
      return Response.json({ ok: true });
    }),
  ),

  get: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json().catch(() => ({}))) as { id: number };
      const result = await personaService.get(body.id, userId);
      return Response.json(result);
    }),
  ),

  getDefault: errorGuard(
    withUserId(async (_req: Request, userId: string): Promise<Response> => {
      const result = await personaService.getDefault(userId);
      return Response.json(result);
    }),
  ),

  all: errorGuard(
    withUserId(async (_req: Request, userId: string): Promise<Response> => {
      const result = await personaService.getAll(userId);
      return Response.json(result);
    }),
  ),
};
