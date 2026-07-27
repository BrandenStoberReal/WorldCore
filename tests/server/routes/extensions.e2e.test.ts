import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { extensionsRoutes } from '@/server/routes/extensions.routes';
import { db } from '@/server/db/client';
import { extensions } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { getGlobalExtensionPath, getUserExtensionPath, DATA_ROOT } from '@/server/storage/paths';

const PREFIX = '/api/v1/extensions';

function git(args: string[], opts?: { cwd?: string }) {
  const proc = Bun.spawnSync({
    cmd: ['git', ...args],
    cwd: opts?.cwd,
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
      GIT_AUTHOR_NAME: 'test',
      GIT_AUTHOR_EMAIL: 'test@test.com',
      GIT_COMMITTER_NAME: 'test',
      GIT_COMMITTER_EMAIL: 'test@test.com',
    },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  return {
    exitCode: proc.exitCode,
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
  };
}

function createSourceRepo(extId: string, manifest: Record<string, unknown> = {}): string {
  const baseDir = mkdtempSync(join(tmpdir(), 'worldcore-e2e-src-'));
  const dir = join(baseDir, extId);
  mkdirSync(dir, { recursive: true });
  git(['init', '-b', 'main', dir], { cwd: dir });
  writeFileSync(
    join(dir, 'manifest.json'),
    JSON.stringify({
      id: extId,
      displayName: `Display ${extId}`,
      version: '1.0.0',
      author: 'tester',
      description: 'integration test extension',
      js: 'index.js',
      loadingOrder: 100,
      dependencies: [],
      peerDependencies: [],
      ...manifest,
    }),
  );
  writeFileSync(
    join(dir, 'index.js'),
    `console.log('hello from ${extId}');\nglobalThis.__WorldCore_activate__ && globalThis.__WorldCore_activate__('${extId}');`,
  );
  git(['add', '.'], { cwd: dir });
  git(['commit', '-m', 'init', '--no-gpg-sign'], { cwd: dir });
  return dir;
}

function req(route: string, init?: RequestInit): Request {
  return new Request(`http://localhost${PREFIX}${route}`, init);
}

function postReq(route: string, body: unknown): Request {
  return req(route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function call<T = unknown>(
  fn: (req: Request) => Promise<Response>,
  r: Request,
): Promise<{ status: number; data: T }> {
  const res = await fn(r);
  const data = (await res.json().catch(() => null)) as T;
  return { status: res.status, data };
}

interface ExtensionRow {
  id: string;
  displayName: string;
  version: string;
  scope: 'user' | 'global';
  enabled: boolean;
  author: string;
  description: string;
}

const createdRepos: string[] = [];
let prevAdminEnv: string | undefined;

async function cleanAll(): Promise<void> {
  await db.delete(extensions);
  for (const repo of createdRepos) {
    try {
      rmSync(repo, { recursive: true, force: true });
    } catch {
      // already gone
    }
  }
  createdRepos.length = 0;
  try {
    rmSync(path.join(DATA_ROOT, 'default-user', 'extensions'), {
      recursive: true,
      force: true,
    });
  } catch {
    // already gone
  }
  try {
    rmSync(path.join(DATA_ROOT, 'alice', 'extensions'), {
      recursive: true,
      force: true,
    });
  } catch {
    // already gone
  }
  try {
    rmSync(path.join(DATA_ROOT, 'extensions'), {
      recursive: true,
      force: true,
    });
  } catch {
    // already gone
  }
}

function mintSessionCookie(userId: string): string {
  const { signSession } = require('@/server/auth/session');
  return signSession({ userId, csrfToken: 'e2e-csrf' });
}

function reqAs(userId: string, route: string, init?: RequestInit): Request {
  const r = req(route, init);
  r.headers.set('Cookie', `WorldCore-session=${mintSessionCookie(userId)}`);
  return r;
}

function postReqAs(userId: string, route: string, body: unknown): Request {
  return reqAs(userId, route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Extensions HTTP API end-to-end (in-process, real sqlite + real git)', () => {
  beforeEach(async () => {
    await cleanAll();
    prevAdminEnv = process.env.WORLDCORE_ALLOW_ADMIN_GLOBAL_INSTALL;
    delete process.env.WORLDCORE_ALLOW_ADMIN_GLOBAL_INSTALL;
  });
  afterEach(async () => {
    if (prevAdminEnv === undefined) {
      delete process.env.WORLDCORE_ALLOW_ADMIN_GLOBAL_INSTALL;
    } else {
      process.env.WORLDCORE_ALLOW_ADMIN_GLOBAL_INSTALL = prevAdminEnv;
    }
    await cleanAll();
  });

  it('install → list → get → enable/disable → settings → asset → uninstall lifecycle', async () => {
    const src = createSourceRepo('lifecycle-ext');
    createdRepos.push(src);

    const installRes = await call<{ ok: boolean; extension: ExtensionRow }>(
      (r) => extensionsRoutes.install(r),
      postReq('/install', { url: src, scope: 'user' }),
    );
    expect(installRes.status).toBe(200);
    expect(installRes.data?.extension.id).toBe('lifecycle-ext');

    const listRes = await call<ExtensionRow[]>(
      (r) => extensionsRoutes.list(r),
      postReq('/list', {}),
    );
    expect(listRes.status).toBe(200);
    const foundInList = listRes.data!.find((e) => e.id === 'lifecycle-ext');
    expect(foundInList).toBeDefined();
    expect(foundInList!.enabled).toBe(true);

    const getRes = await call<ExtensionRow>(
      (r) => extensionsRoutes.get(r),
      req('/get?id=lifecycle-ext', { method: 'POST' }),
    );
    expect(getRes.status).toBe(200);
    expect(getRes.data?.id).toBe('lifecycle-ext');

    const disableRes = await call<{ ok: boolean; extension: ExtensionRow }>(
      (r) => extensionsRoutes.disable(r),
      postReq('/disable', { id: 'lifecycle-ext' }),
    );
    expect(disableRes.status).toBe(200);
    expect(disableRes.data?.extension.enabled).toBe(false);

    const enableRes = await call<{ ok: boolean; extension: ExtensionRow }>(
      (r) => extensionsRoutes.enable(r),
      postReq('/enable', { id: 'lifecycle-ext' }),
    );
    expect(enableRes.status).toBe(200);
    expect(enableRes.data?.extension.enabled).toBe(true);

    const patchRes = await call<{ ok: boolean; settings: Record<string, unknown> }>(
      (r) => extensionsRoutes.patchSettings(r),
      postReq('/patch-settings', {
        id: 'lifecycle-ext',
        key: 'greeting',
        value: 'howdy',
      }),
    );
    expect(patchRes.status).toBe(200);
    expect(patchRes.data?.settings.greeting).toBe('howdy');

    const getSettingsRes = await call<{ ok: boolean; settings: Record<string, unknown> }>(
      (r) => extensionsRoutes.getSettings(r),
      req('/get-settings?id=lifecycle-ext', { method: 'POST' }),
    );
    expect(getSettingsRes.status).toBe(200);
    expect(getSettingsRes.data?.settings.greeting).toBe('howdy');

    const assetRes = await extensionsRoutes.serveAsset(
      req('/assets/lifecycle-ext/index.js', { method: 'GET' }),
    );
    expect(assetRes.status).toBe(200);
    expect(assetRes.headers.get('Content-Type')).toBe('application/javascript');
    const assetBody = await assetRes.text();
    expect(assetBody).toContain('hello from lifecycle-ext');

    const uninstallRes = await call<{ ok: boolean }>(
      (r) => extensionsRoutes.uninstall(r),
      postReq('/uninstall', { id: 'lifecycle-ext' }),
    );
    expect(uninstallRes.status).toBe(200);
    expect(uninstallRes.data?.ok).toBe(true);

    const listAfterRes = await call<ExtensionRow[]>(
      (r) => extensionsRoutes.list(r),
      postReq('/list', {}),
    );
    const stillThere = listAfterRes.data!.find((e) => e.id === 'lifecycle-ext');
    expect(stillThere).toBeUndefined();

    const dir = getUserExtensionPath('default-user', 'lifecycle-ext');
    let exists = false;
    try {
      const stat = await import('node:fs/promises').then((m) => m.stat(dir));
      exists = stat.isDirectory();
    } catch {
      exists = false;
    }
    expect(exists).toBe(false);
  });

  it('per-user isolation: alice cannot see/install over default-user extensions', async () => {
    const aliceSrc = createSourceRepo('alice-private-ext');
    createdRepos.push(aliceSrc);

    const aliceInstall = await call<{ ok: boolean; extension: ExtensionRow }>(
      (r) => extensionsRoutes.install(r),
      postReqAs('alice', '/install', { url: aliceSrc, scope: 'user' }),
    );
    expect(aliceInstall.status).toBe(200);
    expect(aliceInstall.data?.extension.id).toBe('alice-private-ext');

    const aliceList = await call<ExtensionRow[]>(
      (r) => extensionsRoutes.list(r),
      postReqAs('alice', '/list', {}),
    );
    expect(aliceList.data!.find((e) => e.id === 'alice-private-ext')).toBeDefined();

    const defaultUserList = await call<ExtensionRow[]>(
      (r) => extensionsRoutes.list(r),
      postReq('/list', {}),
    );
    expect(defaultUserList.data!.find((e) => e.id === 'alice-private-ext')).toBeUndefined();

    const getAsDefault = await call<ExtensionRow>(
      (r) => extensionsRoutes.get(r),
      req('/get?id=alice-private-ext', { method: 'POST' }),
    );
    expect(getAsDefault.status).toBe(404);

    const uninstallAsDefault = await call<{ ok: boolean }>(
      (r) => extensionsRoutes.uninstall(r),
      postReq('/uninstall', { id: 'alice-private-ext' }),
    );
    expect(uninstallAsDefault.status).toBe(404);

    const aliceDir = getUserExtensionPath('alice', 'alice-private-ext');
    let aliceDirExists = false;
    try {
      const stat = await import('node:fs/promises').then((m) => m.stat(aliceDir));
      aliceDirExists = stat.isDirectory();
    } catch {
      aliceDirExists = false;
    }
    expect(aliceDirExists).toBe(true);

    const defaultDir = getUserExtensionPath('default-user', 'alice-private-ext');
    let defaultDirExists = false;
    try {
      const stat = await import('node:fs/promises').then((m) => m.stat(defaultDir));
      defaultDirExists = stat.isDirectory();
    } catch {
      defaultDirExists = false;
    }
    expect(defaultDirExists).toBe(false);
  });

  it('global preinstalled extension is visible to all users', async () => {
    process.env.WORLDCORE_ALLOW_ADMIN_GLOBAL_INSTALL = '1';
    const src = createSourceRepo('shared-global-ext');
    createdRepos.push(src);

    const installRes = await call<{ ok: boolean; extension: ExtensionRow }>(
      (r) => extensionsRoutes.install(r),
      postReq('/install', { url: src, scope: 'global' }),
    );
    expect(installRes.status).toBe(200);
    expect(installRes.data?.extension.scope).toBe('global');

    const defaultList = await call<ExtensionRow[]>(
      (r) => extensionsRoutes.list(r),
      postReq('/list', {}),
    );
    expect(defaultList.data!.find((e) => e.id === 'shared-global-ext')).toBeDefined();

    const aliceList = await call<ExtensionRow[]>(
      (r) => extensionsRoutes.list(r),
      postReqAs('alice', '/list', {}),
    );
    expect(aliceList.data!.find((e) => e.id === 'shared-global-ext')).toBeDefined();

    const aliceGet = await call<ExtensionRow>(
      (r) => extensionsRoutes.get(r),
      reqAs('alice', '/get?id=shared-global-ext', { method: 'POST' }),
    );
    expect(aliceGet.status).toBe(200);

    const aliceAsset = await extensionsRoutes.serveAsset(
      reqAs('alice', '/assets/shared-global-ext/index.js', { method: 'GET' }),
    );
    expect(aliceAsset.status).toBe(200);
    expect(aliceAsset.headers.get('Content-Type')).toBe('application/javascript');

    delete process.env.WORLDCORE_ALLOW_ADMIN_GLOBAL_INSTALL;
    const uninstallAsAlice = await call<{ ok: boolean }>(
      (r) => extensionsRoutes.uninstall(r),
      postReqAs('alice', '/uninstall', { id: 'shared-global-ext' }),
    );
    expect(uninstallAsAlice.status).toBe(403);
  });

  it('validate rejects invalid manifest upfront (no side effect)', async () => {
    const validateRes = await call<{ ok: boolean; manifest?: unknown }>(
      (r) => extensionsRoutes.validate(r),
      postReq('/validate', {
        id: 'bad-peer-deps',
        displayName: 'Bad',
        version: '1.0.0',
        author: 'tester',
        peerDependencies: ['foo'],
      }),
    );
    expect(validateRes.status).toBe(400);
    expect(validateRes.data?.ok).not.toBe(true);
  });
});
