import { getSession } from '@/server/auth/session';
import { getCurrentUser, DEFAULT_USER } from '@/server/auth/users';
import type { RouteHandler } from '@/server/routes';
import type { User } from '@/shared/types/user';

export function setUserMiddleware(req: Request): void {
  const session = getSession(req);
  (req as Request & { user: User }).user = session ? DEFAULT_USER : DEFAULT_USER;
}

export function requireLoginMiddleware(
  handler: (req: Request & { user: User }, ctx: unknown) => Promise<Response>,
) {
  return async (req: Request, ctx: unknown): Promise<Response> => {
    const typedReq = req as Request & { user: User };
    if (!typedReq.user) {
      return Response.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 },
      );
    }
    return handler(typedReq, ctx);
  };
}

export function requireAdminMiddleware(
  handler: (req: Request & { user: User }, ctx: unknown) => Promise<Response>,
) {
  return async (req: Request, ctx: unknown): Promise<Response> => {
    const typedReq = req as Request & { user: User };
    if (!typedReq.user || typedReq.user.role !== 'admin') {
      return Response.json(
        { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 },
      );
    }
    return handler(typedReq, ctx);
  };
}

export function withAdmin(handler: RouteHandler): RouteHandler {
  return async (req: Request): Promise<Response> => {
    const session = getSession(req);
    if (!session) {
      return Response.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 },
      );
    }
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
      return Response.json(
        { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 },
      );
    }
    return handler(req);
  };
}
