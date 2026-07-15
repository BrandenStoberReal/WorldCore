import { errorGuard } from '@/server/middleware/errorGuard';
import { registerRateLimitMiddleware } from '@/server/middleware/rateLimit';
import { DEFAULT_USER } from '@/server/auth/users';

export const usersAdminRoutes = {
  get: errorGuard(async (_req: Request): Promise<Response> => {
    return Response.json([DEFAULT_USER]);
  }),

  disable: errorGuard(async (_req: Request): Promise<Response> => {
    return Response.json({ ok: true, message: 'Multi-user disabled until Phase 9' });
  }),

  enable: errorGuard(async (_req: Request): Promise<Response> => {
    return Response.json({ ok: true, message: 'Multi-user disabled until Phase 9' });
  }),

  promote: errorGuard(async (_req: Request): Promise<Response> => {
    return Response.json({ ok: true });
  }),

  demote: errorGuard(async (_req: Request): Promise<Response> => {
    return Response.json({ ok: true });
  }),

  create: registerRateLimitMiddleware(
    errorGuard(async (_req: Request): Promise<Response> => {
      return Response.json({ ok: true, message: 'Multi-user disabled until Phase 9' });
    }),
  ),

  delete: errorGuard(async (_req: Request): Promise<Response> => {
    return Response.json({ ok: true, message: 'Cannot delete default user' });
  }),

  slugify: errorGuard(async (_req: Request): Promise<Response> => {
    const body = (await _req.json()) as { name?: string };
    const slug = (body.name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return Response.json({ slug });
  }),
};
