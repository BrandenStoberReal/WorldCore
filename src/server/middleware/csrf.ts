import { getSession, setSessionCookie, generateCsrfToken } from '@/server/auth/session';
import { verifyCsrfToken } from '@/server/auth/csrf';

export function csrfMiddleware(handler: (req: Request, ctx: unknown) => Promise<Response>) {
  return async (req: Request, ctx: unknown): Promise<Response> => {
    let session = getSession(req);

    if (!session) {
      session = {
        userId: 'default-user',
        csrfToken: generateCsrfToken(),
      };
    }

    if (!session.csrfToken) {
      session.csrfToken = generateCsrfToken();
    }

    if (!verifyCsrfToken(req, session.csrfToken)) {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return Response.json(
          { error: { code: 'CSRF_INVALID', message: 'Invalid CSRF token' } },
          { status: 403 },
        );
      }
    }

    const res = await handler(req, ctx);
    setSessionCookie(res, session);
    return res;
  };
}
