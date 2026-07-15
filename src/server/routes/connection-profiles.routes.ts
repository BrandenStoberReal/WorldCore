import { errorGuard } from '@/server/middleware/errorGuard';
import { connectionProfileService } from '@/server/services/connection-profile.service';
import {
  ConnectionProfileCreateInputSchema,
  ConnectionProfileUpdateInputSchema,
} from '@/shared/schemas/connection-profile';
import { ValidationError, NotFoundError } from '@/server/errors';
import { DEFAULT_USER } from '@/server/auth/users';

export const connectionProfilesRoutes = {
  create: errorGuard(async (req: Request): Promise<Response> => {
    const body = await req.json();
    const parsed = ConnectionProfileCreateInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten());
    }
    const userId = DEFAULT_USER.id;
    const profile = await connectionProfileService.create(userId, parsed.data);
    return Response.json(profile);
  }),

  all: errorGuard(async (_req: Request): Promise<Response> => {
    const userId = DEFAULT_USER.id;
    const profiles = await connectionProfileService.getAll(userId);
    return Response.json(profiles);
  }),

  get: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json().catch(() => ({}))) as { id?: string };
    if (!body.id) {
      throw new ValidationError({ fieldErrors: { id: ['Required'] } });
    }
    const userId = DEFAULT_USER.id;
    const profile = await connectionProfileService.getOne(userId, body.id);
    if (!profile) {
      throw new NotFoundError(`Connection profile "${body.id}"`);
    }
    return Response.json(profile);
  }),

  update: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { id?: string } & Record<string, unknown>;
    if (!body.id) {
      throw new ValidationError({ fieldErrors: { id: ['Required'] } });
    }
    const { id: _id, ...fields } = body;
    const parsed = ConnectionProfileUpdateInputSchema.safeParse(fields);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten());
    }
    const userId = DEFAULT_USER.id;
    const profile = await connectionProfileService.update(userId, body.id, parsed.data);
    return Response.json(profile);
  }),

  delete: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { id: string };
    if (!body.id) {
      throw new ValidationError({ fieldErrors: { id: ['Required'] } });
    }
    const userId = DEFAULT_USER.id;
    await connectionProfileService.delete(userId, body.id);
    return Response.json({ ok: true });
  }),
};
