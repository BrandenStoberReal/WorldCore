import type { SessionPayload } from '@/server/auth/session';
import { getSession } from '@/server/auth/session';
import { resolveUserFromSession } from '@/server/auth/users';
import { ensureUserExtensionDir } from '@/server/storage/paths';
import type { User } from '@/shared/types/user';

/**
 * Wraps a route handler with session→userId resolution + eager user extension
 * dir creation. Mirrors `withUserId` but calls `ensureUserExtensionDir` instead
 * of the character dir. Used by all extension routes that operate per-user.
 *
 * Resolution order:
 *   1. `getSession(req)` → `SessionPayload | null`
 *   2. `resolveUserFromSession(session)` → `User` (DEFAULT_USER fallback when
 *      the session is null or has an empty userId — no DB lookup)
 *   3. `ensureUserExtensionDir(user.id)` — idempotent; safe for `default-user`
 *   4. `handler(req, user.id)` → Response
 */
export function withExtensionUserId<TReq extends Request = Request>(
  handler: (req: TReq, userId: string) => Promise<Response> | Response,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const session: SessionPayload | null = getSession(req);
    const user: User = resolveUserFromSession(session);
    ensureUserExtensionDir(user.id);
    return handler(req as TReq, user.id);
  };
}
