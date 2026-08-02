import { errorGuard } from '@/server/middleware/errorGuard';
import { registerRateLimitMiddleware } from '@/server/middleware/rateLimit';
import { withAdmin } from '@/server/middleware/auth';
import { DEFAULT_USER } from '@/server/auth/users';

export const usersAdminRoutes = {
  get: withAdmin(
    errorGuard(async (_req: Request): Promise<Response> => {
      return Response.json([DEFAULT_USER]);
    }),
  ),

  disable: withAdmin(
    errorGuard(async (_req: Request): Promise<Response> => {
      return Response.json({ ok: true, message: 'Multi-user disabled until Phase 9' });
    }),
  ),

  enable: withAdmin(
    errorGuard(async (_req: Request): Promise<Response> => {
      return Response.json({ ok: true, message: 'Multi-user disabled until Phase 9' });
    }),
  ),

  promote: withAdmin(
    errorGuard(async (_req: Request): Promise<Response> => {
      return Response.json({ ok: true });
    }),
  ),

  demote: withAdmin(
    errorGuard(async (_req: Request): Promise<Response> => {
      return Response.json({ ok: true });
    }),
  ),

  create: withAdmin(
    registerRateLimitMiddleware(
      errorGuard(async (_req: Request): Promise<Response> => {
        return Response.json({ ok: true, message: 'Multi-user disabled until Phase 9' });
      }),
    ),
  ),

  delete: withAdmin(
    errorGuard(async (_req: Request): Promise<Response> => {
      return Response.json({ ok: true, message: 'Cannot delete default user' });
    }),
  ),

  slugify: withAdmin(
    errorGuard(async (_req: Request): Promise<Response> => {
      const body = (await _req.json()) as { name?: string };
      const slug = (body.name || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      return Response.json({ slug });
    }),
  ),
};
