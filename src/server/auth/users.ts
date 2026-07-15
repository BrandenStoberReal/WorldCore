import type { User } from '@/shared/types/user';

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
