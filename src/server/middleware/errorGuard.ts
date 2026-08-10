import { ApiError, securityHeaders } from '@/server/errors';

export type GuardedHandler = (req: Request, ctx?: unknown) => Promise<Response>;

async function tryReadBody(reqOrRes: Request | Response): Promise<unknown> {
  try {
    const clone = reqOrRes.clone();
    const text = await clone.text();
    if (!text) return undefined;
    return JSON.parse(text);
  } catch {
    return '<unreadable>';
  }
}

export function errorGuard(handler: GuardedHandler): GuardedHandler {
  return async (req: Request, _ctx?: unknown): Promise<Response> => {
    const url = new URL(req.url);
    try {
      const res = await handler(req, _ctx);
      if (res.status >= 400) {
        const body = await tryReadBody(req);
        const resBody = await tryReadBody(res.clone());
        console.error(`[${req.method} ${url.pathname}] ${res.status}`, {
          reqBody: body,
          resBody,
        });
      }
      return res;
    } catch (err) {
      const body = await tryReadBody(req);
      if (err instanceof ApiError) {
        console.error(`[${req.method} ${url.pathname}] ${err.httpStatus}`, {
          reqBody: body,
          errCode: err.code,
          errMsg: err.message,
        });
        return err.toResponse();
      }
      console.error(`[${req.method} ${url.pathname}] 500 unhandled`, {
        reqBody: body,
        err,
      });
      return Response.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
        { status: 500, headers: securityHeaders },
      );
    }
  };
}
