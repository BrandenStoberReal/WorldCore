import { describe, it, expect, afterAll } from 'bun:test';
import path from 'node:path';
import fs from 'node:fs';
import { signSession } from '@/server/auth/session';
import { DATA_ROOT } from '@/server/storage/paths';
import { withUserId } from '@/server/middleware/withUserId';
import { errorGuard } from '@/server/middleware/errorGuard';
import { NotFoundError } from '@/server/errors';

const COOKIE_NAME = 'WorldCore-session';
const DIR_TEST_USER = 'test-withuser-dir';

afterAll(() => {
  // Clean up only the synthetic test dir; never touch default-user or real users.
  fs.rmSync(path.join(DATA_ROOT, DIR_TEST_USER), { recursive: true, force: true });
});

function makeRequest(cookie?: string): Request {
  const headers: Record<string, string> = {};
  if (cookie !== undefined) {
    headers.Cookie = `${COOKIE_NAME}=${cookie}`;
  }
  return new Request('https://test/characters/all', { method: 'POST', headers });
}

describe('withUserId', () => {
  it('1. no cookie → handler invoked with "default-user" (DEFAULT_USER fallback)', async () => {
    const req = makeRequest(); // no cookie
    let captured = '';
    const wrapped = withUserId((_req, userId) => {
      captured = userId;
      return new Response('ok');
    });
    const res = await wrapped(req);
    expect(res.status).toBe(200);
    expect(captured).toBe('default-user');
  });

  it('2. valid cookie with userId "user-abc" → handler invoked with "user-abc"', async () => {
    const signed = signSession({ userId: 'user-abc', csrfToken: 'tok' });
    const req = makeRequest(signed);
    let captured = '';
    const wrapped = withUserId((_req, userId) => {
      captured = userId;
      return new Response('ok');
    });
    const res = await wrapped(req);
    expect(res.status).toBe(200);
    expect(captured).toBe('user-abc');
  });

  it('3. empty userId in session → handler invoked with "default-user" (Q1 fallback)', async () => {
    const signed = signSession({ userId: '', csrfToken: 'x' });
    const req = makeRequest(signed);
    let captured = '';
    const wrapped = withUserId((_req, userId) => {
      captured = userId;
      return new Response('ok');
    });
    const res = await wrapped(req);
    expect(res.status).toBe(200);
    expect(captured).toBe('default-user');
  });

  it('4. eager dir creation: after handler with userId "test-withuser-dir", characters dir exists', async () => {
    const signed = signSession({ userId: DIR_TEST_USER, csrfToken: 't' });
    const req = makeRequest(signed);
    const expectedDir = path.join(DATA_ROOT, DIR_TEST_USER, 'characters');
    // Clean slate to prove the HOF creates it.
    fs.rmSync(path.join(DATA_ROOT, DIR_TEST_USER), { recursive: true, force: true });
    expect(fs.existsSync(expectedDir)).toBe(false);

    const wrapped = withUserId((_req, _userId) => new Response('ok'));
    await wrapped(req);
    expect(fs.existsSync(expectedDir)).toBe(true);
  });

  it('5. pass-through: the Response from the handler is returned unchanged by the HOF wrapper', async () => {
    const req = makeRequest();
    const sentinel = new Response('sentinel-body', {
      status: 201,
      headers: { 'X-Sentinel': 'yes' },
    });
    const wrapped = withUserId(() => sentinel);
    const res = await wrapped(req);
    expect(res).toBe(sentinel);
    expect(res.status).toBe(201);
    expect(res.headers.get('X-Sentinel')).toBe('yes');
    expect(await res.text()).toBe('sentinel-body');
  });

  it('6. composes with errorGuard: handler throws NotFoundError → errorGuard JSON shape + 404', async () => {
    const req = makeRequest();
    const handler = withUserId(() => {
      throw new NotFoundError('Character');
    });
    const guarded = errorGuard(handler);
    const res = await guarded(req);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('Character not found');
  });
});
