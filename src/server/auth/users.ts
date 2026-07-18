import { eq } from 'drizzle-orm';
import type { User } from '@/shared/types/user';
import type { SessionPayload } from '@/server/auth/session';
import { db } from '@/server/db/client';
import { users } from '@/server/db/schema';

export interface DbUser {
  id: string;
  handle: string;
  name: string;
  passwordHash: string | null;
  role: string;
  avatar: string;
  enabled: boolean;
  createdAt: number;
}

export async function getUserById(id: string): Promise<DbUser | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  const row = rows[0];
  if (!row || !row.enabled) return null;
  return row as DbUser;
}

export function resolveUserFromSession(session: SessionPayload | null): User {
  if (!session || !session.userId) {
    return DEFAULT_USER;
  }
  return { id: session.userId, username: session.userId, role: 'user' };
}

export const DEFAULT_USER: User = {
  id: 'default-user',
  username: 'default-user',
  role: 'admin',
};

export function getCurrentUser(): User {
  return DEFAULT_USER;
}

export function requireLogin(): User {
  return DEFAULT_USER;
}

export function requireAdmin(): User {
  const user = getCurrentUser();
  if (user.role !== 'admin') {
    throw new Error('FORBIDDEN');
  }
  return user;
}
