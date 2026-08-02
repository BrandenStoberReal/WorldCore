import { describe, expect, test } from 'bun:test';
import { withAdmin } from '../auth';
import { signSession, type SessionPayload } from '@/server/auth/session';

function makeRequest(sessionCookie?: string): Request {
  const headers: Record<string, string> = {};
  if (sessionCookie) {
    headers.Cookie = `WorldCore-session=${sessionCookie}`;
  }
  return new Request('http://localhost/api/test', { headers });
}

function makeSessionCookie(payload: SessionPayload): string {
  return signSession(payload);
}

describe('withAdmin', () => {
  test('returns 401 UNAUTHORIZED when no session cookie', async () => {
    const handler = withAdmin(async () => Response.json({ ok: true }));
    const res = await handler(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toBe('Authentication required');
  });

  test('calls handler when valid session exists and user is admin', async () => {
    let handlerCalled = false;
    const handler = withAdmin(async () => {
      handlerCalled = true;
      return Response.json({ ok: true });
    });
    const cookie = makeSessionCookie({ userId: 'default-user', csrfToken: 'tok' });
    const res = await handler(makeRequest(cookie));
    expect(handlerCalled).toBe(true);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
