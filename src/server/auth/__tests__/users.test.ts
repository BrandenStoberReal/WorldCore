import { describe, expect, test } from 'bun:test';
import { getCurrentUser, requireLogin, requireAdmin } from '../users';

describe('users', () => {
  test('getCurrentUser returns default user', () => {
    const user = getCurrentUser();
    expect(user.id).toBe('default-user');
    expect(user.username).toBe('default-user');
    expect(user.role).toBe('admin');
  });

  test('requireLogin returns default user', () => {
    const user = requireLogin();
    expect(user.id).toBe('default-user');
  });

  test('requireAdmin returns default user with admin role', () => {
    const user = requireAdmin();
    expect(user.id).toBe('default-user');
    expect(user.role).toBe('admin');
  });
});
