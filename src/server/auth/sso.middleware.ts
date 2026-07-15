import { getSession } from '@/server/auth/session';
import { handleAutheliaAuth, verifyBasicAuth, getSSOSettingsSafe } from '@/server/auth/sso.service';
import { setSessionCookie, generateCsrfToken } from '@/server/auth/session';
import type { User } from '@/shared/types/user';

let cachedSSOUser: User | null = null;
let ssoCacheTime = 0;

const SSO_CACHE_TTL = 30_000;

async function checkSSOAuth(req: Request): Promise<{ user: User; needsSession: boolean } | null> {
  const settings = await getSSOSettingsSafe();
  if (!settings.enabled) return null;

  if (settings.provider === 'authelia') {
    const user = await handleAutheliaAuth(req);
    if (user) return { user, needsSession: true };
  }

  if (settings.provider === 'basicauth') {
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const user = await verifyBasicAuth(authHeader, settings);
      if (user) return { user, needsSession: true };
    }
  }

  return null;
}

export async function ssoMiddleware(
  req: Request,
  handler: (req: Request) => Promise<Response>,
): Promise<Response> {
  const existingSession = getSession(req);
  if (existingSession) {
    return handler(req);
  }

  const now = Date.now();
  if (cachedSSOUser && now - ssoCacheTime < SSO_CACHE_TTL) {
    return handler(req);
  }

  const ssoResult = await checkSSOAuth(req);
  if (ssoResult) {
    cachedSSOUser = ssoResult.user;
    ssoCacheTime = now;

    if (ssoResult.needsSession) {
      const session = {
        userId: ssoResult.user.id,
        csrfToken: generateCsrfToken(),
      };
      const res = await handler(req);
      setSessionCookie(res, session);
      return res;
    }
  }

  return handler(req);
}

export function ssoAuthMiddleware(
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    return ssoMiddleware(req, handler);
  };
}
