import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { usersPrivateRoutes } from '../users.private.routes';
import { db } from '@/server/db/client';
import { users } from '@/server/db/schema';
import { signSession } from '@/server/auth/session';
import { eq } from 'drizzle-orm';

describe('Users private routes – /me handler', () => {
  const TEST_ID = 'test-private-me-user';

  beforeEach(async () => {
    await db.insert(users).values({
      id: TEST_ID,
      handle: 'test_handle',
      name: 'Test Name',
      passwordHash: null,
      role: 'user',
      avatar: 'https://example.com/avatar.png',
      enabled: true,
      createdAt: Date.now(),
    });
  });

  afterEach(async () => {
    await db.delete(users).where(eq(users.id, TEST_ID));
  });

  it('returns DEFAULT_USER id when no session cookie is present', async () => {
    const res = await usersPrivateRoutes.me(new Request('http://localhost/api/v1/users/me'));
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.id).toBe('default-user');
    expect(data.handle).toBe('default-user');
    expect(data.admin).toBe(true);
  });

  it('returns enriched DB user info when valid session cookie exists', async () => {
    const signed = signSession({ userId: TEST_ID, csrfToken: 'csrf-ok' });
    const res = await usersPrivateRoutes.me(
      new Request('http://localhost/api/v1/users/me', {
        headers: { Cookie: `WorldCore-session=${signed}` },
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.id).toBe(TEST_ID);
    expect(data.handle).toBe('test_handle');
    expect(data.name).toBe('Test Name');
    expect(data.avatar).toBe('https://example.com/avatar.png');
    expect(data.admin).toBe(false);
  });

  it('falls back to DEFAULT_USER when session user does not exist in DB', async () => {
    const signed = signSession({ userId: 'ghost-user-id', csrfToken: 'csrf-ghost' });
    const res = await usersPrivateRoutes.me(
      new Request('http://localhost/api/v1/users/me', {
        headers: { Cookie: `WorldCore-session=${signed}` },
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.id).toBe('default-user');
    expect(data.handle).toBe('default-user');
  });
});
