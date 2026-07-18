import type { SessionPayload } from '@/server/auth/session';
import { getSession } from '@/server/auth/session';
import { resolveUserFromSession } from '@/server/auth/users';
import { ensureUserCharacterDir } from '@/server/storage/paths';
import type { User } from '@/shared/types/user';

/**
 * Wraps a route handler with session→userId resolution + eager user character
 * dir creation. Opt-in per character route — never installed at the app.ts
 * dispatch level.
 *
 * Resolution order:
 *   1. `getSession(req)` → `SessionPayload | null`
 *   2. `resolveUserFromSession(session)` → `User` (DEFAULT_USER fallback when
 *      the session is null or has an empty userId — no DB lookup)
 *   3. `ensureUserCharacterDir(user.id)` — idempotent; safe for `default-user`
 *      (dir already exists from boot)
 *   4. `handler(req, user.id)` → Response
 */
export function withUserId<TReq extends Request = Request>(
  handler: (req: TReq, userId: string) => Promise<Response> | Response,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const session: SessionPayload | null = getSession(req);
    const user: User = resolveUserFromSession(session);
    ensureUserCharacterDir(user.id);
    return handler(req as TReq, user.id);
  };
}
