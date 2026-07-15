import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { usersPublicRoutes } from '../users.public.routes';
import { db } from '@/server/db/client';
import { users } from '@/server/db/schema';
import { hashPassword } from '@/server/auth/password';
import { eq } from 'drizzle-orm';

describe('SEC-1: Login bypass fix', () => {
  const TEST_USER = 'test-sec1-user';

  beforeEach(async () => {
    // Create a real user with a password
    const hash = await hashPassword('correct-password');
    await db.insert(users).values({
      id: TEST_USER,
      handle: TEST_USER,
      name: 'Test User',
      passwordHash: hash,
      role: 'user',
      enabled: true,
      createdAt: Date.now(),
    });
  });

  afterEach(async () => {
    await db.delete(users).where(eq(users.id, TEST_USER));
  });

  it('rejects login for non-existent user even with non-empty password', async () => {
    const req = new Request('http://localhost/api/v1/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: 'ghost-user-that-does-not-exist', password: 'any-password' }),
    });
    const res = await usersPublicRoutes.login(req);
    expect(res.status).toBe(401);
  });

  it('allows login for existing user with correct password', async () => {
    const req = new Request('http://localhost/api/v1/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: TEST_USER, password: 'correct-password' }),
    });
    const res = await usersPublicRoutes.login(req);
    expect(res.status).toBe(200);
  });

  it('rejects login for existing user with wrong password', async () => {
    const req = new Request('http://localhost/api/v1/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: TEST_USER, password: 'wrong-password' }),
    });
    const res = await usersPublicRoutes.login(req);
    expect(res.status).toBe(401);
  });
});
