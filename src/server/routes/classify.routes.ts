import { errorGuard } from '@/server/middleware/errorGuard';

export const classifyRoutes = {
  classify: errorGuard(async (_req: Request): Promise<Response> => {
    return Response.json({ ok: true, classified: null });
  }),
};
