import { errorGuard } from '@/server/middleware/errorGuard';
import { getSession, setSessionCookie, generateCsrfToken } from '@/server/auth/session';
import { DEFAULT_USER } from '@/server/auth/users';
import { hashPassword, verifyPassword } from '@/server/auth/password';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { users } from '@/server/db/schema';

export const usersPrivateRoutes = {
  me: errorGuard(async (req: Request): Promise<Response> => {
    const session = getSession(req);
    const user = session ? DEFAULT_USER : DEFAULT_USER;
    return Response.json({
      handle: user.username,
      name: user.username,
      admin: user.role === 'admin',
      avatar: '',
    });
  }),

  changeAvatar: errorGuard(async (_req: Request): Promise<Response> => {
    return Response.json({ ok: true });
  }),

  changePassword: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { currentPassword?: string; newPassword?: string };

    if (!body.newPassword || body.newPassword.length < 1) {
      return Response.json(
        { error: { code: 'VALIDATION_ERROR', message: 'New password required' } },
        { status: 400 },
      );
    }

    const dbUser = await db.select().from(users).where(eq(users.id, DEFAULT_USER.id)).limit(1);
    const row = dbUser[0];
    if (row && row.passwordHash && body.currentPassword) {
      const valid = await verifyPassword(body.currentPassword, row.passwordHash);
      if (!valid) {
        return Response.json(
          { error: { code: 'AUTH_FAILED', message: 'Current password incorrect' } },
          { status: 401 },
        );
      }
    }

    const hash = await hashPassword(body.newPassword);
    await db.update(users).set({ passwordHash: hash }).where(eq(users.id, DEFAULT_USER.id));

    return Response.json({ ok: true });
  }),

  backup: errorGuard(async (_req: Request): Promise<Response> => {
    return Response.json({ ok: true, message: 'Backup endpoint stub' });
  }),

  resetSettings: errorGuard(async (_req: Request): Promise<Response> => {
    return Response.json({ ok: true });
  }),

  changeName: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { name?: string };
    if (!body.name) {
      return Response.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Name required' } },
        { status: 400 },
      );
    }
    return Response.json({ ok: true, name: body.name });
  }),

  resetStep1: errorGuard(async (_req: Request): Promise<Response> => {
    return Response.json({ ok: true });
  }),

  resetStep2: errorGuard(async (_req: Request): Promise<Response> => {
    return Response.json({ ok: true });
  }),
};
