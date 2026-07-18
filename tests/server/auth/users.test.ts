import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { db } from '@/server/db/client';
import { users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import type { SessionPayload } from '@/server/auth/session';

// Import from the module under test — getUserById and resolveUserFromSession
// don't exist yet; this file is written TDD-style and will pass once they are added.
import { getUserById, resolveUserFromSession, DEFAULT_USER } from '@/server/auth/users';

const ENABLED_USER = 'test-enabled-user';
const DISABLED_USER = 'test-disabled-user';

describe('resolveUserFromSession', () => {
  it('returns DEFAULT_USER when session is null', () => {
    expect(resolveUserFromSession(null)).toEqual(DEFAULT_USER);
  });

  it('returns DEFAULT_USER when session has empty userId', () => {
    const session: SessionPayload = { userId: '', csrfToken: 'x' };
    expect(resolveUserFromSession(session)).toEqual(DEFAULT_USER);
  });

  it('returns a minimal User for a valid session', () => {
    const session: SessionPayload = { userId: 'user-abc', csrfToken: 'tok' };
    const result = resolveUserFromSession(session);
    expect(result).toEqual({ id: 'user-abc', username: 'user-abc', role: 'user' });
    // Must be synchronous (no DB round-trip)
  });
});

describe('getUserById', () => {
  beforeEach(async () => {
    await db.insert(users).values({
      id: ENABLED_USER,
      handle: ENABLED_USER,
      name: 'Enabled Test User',
      passwordHash: null,
      role: 'user',
      avatar: '',
      enabled: true,
      createdAt: 1000,
    });
    await db.insert(users).values({
      id: DISABLED_USER,
      handle: DISABLED_USER,
      name: 'Disabled Test User',
      passwordHash: null,
      role: 'user',
      avatar: '',
      enabled: false,
      createdAt: 2000,
    });
  });

  afterEach(async () => {
    await db.delete(users).where(eq(users.id, ENABLED_USER));
    await db.delete(users).where(eq(users.id, DISABLED_USER));
  });

  it('returns null for a non-existent id', async () => {
    const result = await getUserById('no-such-id');
    expect(result).toBeNull();
  });

  it('returns a DbUser when the user exists and is enabled', async () => {
    const result = await getUserById(ENABLED_USER);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(ENABLED_USER);
    expect(result!.handle).toBe(ENABLED_USER);
    expect(result!.name).toBe('Enabled Test User');
    expect(result!.enabled).toBe(true);
    expect(result!.role).toBe('user');
  });

  it('returns null when the user exists but is disabled', async () => {
    const result = await getUserById(DISABLED_USER);
    expect(result).toBeNull();
  });
});
