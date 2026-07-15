import { errorGuard } from '@/server/middleware/errorGuard';

export const contentRoutes = {
  handle: errorGuard(async (_req: Request): Promise<Response> => {
    return Response.json({ ok: true });
  }),
};
