import { errorGuard } from '@/server/middleware/errorGuard';
import { withUserId } from '@/server/middleware/withUserId';
import { connectionProfileService } from '@/server/services/connection-profile.service';
import {
  ConnectionProfileCreateInputSchema,
  ConnectionProfileUpdateInputSchema,
} from '@/shared/schemas/connection-profile';
import { ValidationError, NotFoundError } from '@/server/errors';

export const connectionProfilesRoutes = {
  create: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = await req.json();
      const parsed = ConnectionProfileCreateInputSchema.safeParse(body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.flatten());
      }
      const profile = await connectionProfileService.create(userId, parsed.data);
      return Response.json(profile);
    }),
  ),

  all: errorGuard(
    withUserId(async (_req: Request, userId: string): Promise<Response> => {
      const profiles = await connectionProfileService.getAll(userId);
      return Response.json(profiles);
    }),
  ),

  get: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json().catch(() => ({}))) as { id?: string };
      if (!body.id) {
        throw new ValidationError({ fieldErrors: { id: ['Required'] } });
      }
      const profile = await connectionProfileService.getOne(userId, body.id);
      if (!profile) {
        throw new NotFoundError(`Connection profile "${body.id}"`);
      }
      return Response.json(profile);
    }),
  ),

  update: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id?: string } & Record<string, unknown>;
      if (!body.id) {
        throw new ValidationError({ fieldErrors: { id: ['Required'] } });
      }
      const { id: _id, ...fields } = body;
      const parsed = ConnectionProfileUpdateInputSchema.safeParse(fields);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.flatten());
      }
      const profile = await connectionProfileService.update(userId, body.id, parsed.data);
      return Response.json(profile);
    }),
  ),

  delete: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id: string };
      if (!body.id) {
        throw new ValidationError({ fieldErrors: { id: ['Required'] } });
      }
      await connectionProfileService.delete(userId, body.id);
      return Response.json({ ok: true });
    }),
  ),
};
