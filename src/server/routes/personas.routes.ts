import { errorGuard } from '@/server/middleware/errorGuard';
import { withUserId } from '@/server/middleware/withUserId';
import { personaService } from '@/server/services/persona.service';
import {
  PersonaCreateInputSchema,
  PersonaEditInputSchema,
  PersonaSetAvatarInputSchema,
} from '@/shared/schemas/persona';
import { z } from 'zod';

const IdSchema = z.object({ id: z.number() });
const RenameSchema = z.object({ id: z.number(), name: z.string().min(1).max(100) });

export const personaRoutes = {
  create: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = PersonaCreateInputSchema.parse(await req.json());
      const result = await personaService.create(body, userId);
      return Response.json({ ok: true, id: result.id });
    }),
  ),

  edit: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const raw = await req.json();
      const id = IdSchema.parse(raw).id;
      const patch = PersonaEditInputSchema.parse(raw);
      await personaService.edit(id, userId, patch);
      return Response.json({ ok: true });
    }),
  ),

  rename: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = RenameSchema.parse(await req.json());
      await personaService.rename(body.id, userId, body.name);
      return Response.json({ ok: true });
    }),
  ),

  setDefault: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = IdSchema.parse(await req.json());
      await personaService.setDefault(body.id, userId);
      return Response.json({ ok: true });
    }),
  ),

  setAvatar: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = PersonaSetAvatarInputSchema.parse(await req.json());
      await personaService.setAvatar(body.id, userId, body.avatar);
      return Response.json({ ok: true });
    }),
  ),

  delete: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = IdSchema.parse(await req.json());
      await personaService.delete(body.id, userId);
      return Response.json({ ok: true });
    }),
  ),

  get: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = IdSchema.parse(await req.json().catch(() => ({})));
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
