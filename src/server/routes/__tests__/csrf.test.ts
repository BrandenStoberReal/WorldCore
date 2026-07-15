import { describe, expect, it } from 'bun:test';
import { usersPublicRoutes } from '../users.public.routes';
import { db } from '@/server/db/client';
import { users } from '@/server/db/schema';
import { hashPassword } from '@/server/auth/password';
import { verifySession } from '@/server/auth/session';
import { eq } from 'drizzle-orm';
import { SHARED_CONST } from '@/shared/constants';

describe('BUG-17: CSRF token consistency', () => {
  const TEST_USER = 'test-csrf-user';

  it('login response token matches session cookie token', async () => {
    // Create test user
    const hash = await hashPassword('test-pass');
    await db.insert(users).values({
      id: TEST_USER,
      handle: TEST_USER,
      name: 'Test',
      passwordHash: hash,
      role: 'user',
      enabled: true,
      createdAt: Date.now(),
    });

    try {
      const req = new Request('http://localhost/api/v1/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: TEST_USER, password: 'test-pass' }),
      });
      const res = await usersPublicRoutes.login(req);
      const body = (await res.json()) as { token: string };

      // Get session cookie
      const setCookie = res.headers.get('Set-Cookie') || '';
      const cookieMatch = setCookie.match(
        new RegExp(`${SHARED_CONST.SESSION_COOKIE_NAME}=([^;]+)`),
      );
      expect(cookieMatch).toBeTruthy();

      // Verify session token matches response token
      const token = cookieMatch![1] as string;
      const session = verifySession(token);
      expect(session).toBeTruthy();
      expect(session!.csrfToken).toBe(body.token);
    } finally {
      await db.delete(users).where(eq(users.id, TEST_USER));
    }
  });
});
