import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { db } from '@/server/db/client';
import { extensions } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { extensionsRoutes } from '@/server/routes/extensions.routes';
import { getGlobalExtensionPath, getUserExtensionPath, DATA_ROOT } from '@/server/storage/paths';
import { SHARED_CONST } from '@/shared/constants';

const PREFIX = `${SHARED_CONST.API_VERSION_PREFIX}/extensions`;

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

function createSourceRepo(
  extId: string,
  manifest: Record<string, unknown>,
  files?: Record<string, string>,
): string {
  const baseDir = mkdtempSync(join(tmpdir(), 'wc-ext-route-src-'));
  const dir = join(baseDir, extId);
  mkdirSync(dir, { recursive: true });
  git(['init', '-b', 'main', dir]);
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  if (files) {
    for (const [name, content] of Object.entries(files)) {
      mkdirSync(join(dir, path.dirname(name)), { recursive: true });
      writeFileSync(join(dir, name), content);
    }
  }
  git(['add', '.'], { cwd: dir });
  git(['commit', '-m', 'init', '--no-gpg-sign'], { cwd: dir });
  return dir;
}

function manifestFor(id: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    displayName: `Display ${id}`,
    version: '1.0.0',
    author: 'tester',
    description: 'A test extension',
    js: 'index.tsx',
    loadingOrder: 100,
    dependencies: [],
    peerDependencies: [],
    ...extra,
  };
}

const createdSourceRepos: string[] = [];
let prevAdminEnv: string | undefined;

async function cleanAll(): Promise<void> {
  await db.delete(extensions);
  for (const repo of createdSourceRepos) {
    try {
      rmSync(repo, { recursive: true, force: true });
    } catch {
      // directory already gone
    }
  }
  createdSourceRepos.length = 0;

  const userExtRoot = path.join(DATA_ROOT, 'default-user', 'extensions');
  try {
    rmSync(userExtRoot, { recursive: true, force: true });
  } catch {
    // already gone
  }
  const globalExtRoot = path.join(DATA_ROOT, 'extensions');
  try {
    rmSync(globalExtRoot, { recursive: true, force: true });
  } catch {
    // already gone
  }
}

async function insertRowDirect(
  id: string,
  scope: 'user' | 'global' = 'user',
  extra: Partial<typeof extensions.$inferInsert> = {},
): Promise<void> {
  const userId = scope === 'global' ? 'default-user' : 'default-user';
  await db.insert(extensions).values({
    id,
    name: id,
    displayName: `Display ${id}`,
    version: '1.0.0',
    author: 'tester',
    description: '',
    gitUrl: null,
    branch: null,
    scope,
    enabled: true,
    settings: {},
    manifestCache: null,
    installedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    userId,
    ...extra,
  });
}

function makeReq(routePath: string, init?: RequestInit): Request {
  return new Request(`http://localhost${routePath}`, init);
}

describe('Extensions routes', () => {
  beforeEach(async () => {
    await cleanAll();
    prevAdminEnv = process.env.WORLDCORE_ALLOW_ADMIN_GLOBAL_INSTALL;
  });
  afterEach(async () => {
    if (prevAdminEnv === undefined) {
      delete process.env.WORLDCORE_ALLOW_ADMIN_GLOBAL_INSTALL;
    } else {
      process.env.WORLDCORE_ALLOW_ADMIN_GLOBAL_INSTALL = prevAdminEnv;
    }
    await cleanAll();
  });

  describe('list', () => {
    it('returns empty array when no extensions installed', async () => {
      const res = await extensionsRoutes.list(makeReq(`${PREFIX}/list`, { method: 'POST' }));
      expect(res.status).toBe(200);
      const data = (await res.json()) as unknown[];
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    it('returns user + global extensions for the user', async () => {
      await insertRowDirect('user-ext-1', 'user');
      await insertRowDirect('global-preinstalled', 'global');
      const res = await extensionsRoutes.list(makeReq(`${PREFIX}/list`, { method: 'POST' }));
      expect(res.status).toBe(200);
      const data = (await res.json()) as Array<{ id: string; scope: string }>;
      const ids = data.map((d) => d.id).sort();
      expect(ids).toEqual(['global-preinstalled', 'user-ext-1']);
    });
  });

  describe('get', () => {
    it('returns 400 when missing id query param', async () => {
      const res = await extensionsRoutes.get(makeReq(`${PREFIX}/get`, { method: 'POST' }));
      expect(res.status).toBe(400);
    });

    it('returns 404 for unknown id', async () => {
      const res = await extensionsRoutes.get(
        makeReq(`${PREFIX}/get?id=does-not-exist`, { method: 'POST' }),
      );
      expect(res.status).toBe(404);
    });

    it('returns extension row when found', async () => {
      await insertRowDirect('get-ext', 'user', { displayName: 'Gettable' });
      const res = await extensionsRoutes.get(
        makeReq(`${PREFIX}/get?id=get-ext`, { method: 'POST' }),
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as { id: string; displayName: string };
      expect(data.id).toBe('get-ext');
      expect(data.displayName).toBe('Gettable');
    });
  });

  describe('validate', () => {
    it('accepts a valid manifest', async () => {
      const res = await extensionsRoutes.validate(
        makeReq(`${PREFIX}/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(manifestFor('valid-ext')),
        }),
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as { ok: boolean; manifest: { id: string } };
      expect(data.ok).toBe(true);
      expect(data.manifest.id).toBe('valid-ext');
    });

    it('rejects manifest with non-empty peerDependencies (400)', async () => {
      const res = await extensionsRoutes.validate(
        makeReq(`${PREFIX}/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(manifestFor('bad-ext', { peerDependencies: ['dep-x'] })),
        }),
      );
      expect(res.status).toBe(400);
    });

    it('rejects non-object body (400)', async () => {
      const res = await extensionsRoutes.validate(
        makeReq(`${PREFIX}/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify('not an object'),
        }),
      );
      expect(res.status).toBe(400);
    });
  });

  describe('install', () => {
    it('installs user-scoped extension from git URL', async () => {
      const src = createSourceRepo('route-install-ext', manifestFor('route-install-ext'));
      createdSourceRepos.push(src);
      const res = await extensionsRoutes.install(
        makeReq(`${PREFIX}/install`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: src, scope: 'user' }),
        }),
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as { ok: boolean; extension: { id: string; scope: string } };
      expect(data.ok).toBe(true);
      expect(data.extension.id).toBe('route-install-ext');
      expect(data.extension.scope).toBe('user');
    });

    it('rejects global install when admin gate env var not set (403)', async () => {
      delete process.env.WORLDCORE_ALLOW_ADMIN_GLOBAL_INSTALL;
      const src = createSourceRepo('global-blocked-ext', manifestFor('global-blocked-ext'));
      createdSourceRepos.push(src);
      const res = await extensionsRoutes.install(
        makeReq(`${PREFIX}/install`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: src, scope: 'global' }),
        }),
      );
      expect(res.status).toBe(403);
    });

    it('installs global-scoped extension when admin gate env var is 1', async () => {
      process.env.WORLDCORE_ALLOW_ADMIN_GLOBAL_INSTALL = '1';
      const src = createSourceRepo('global-allowed-ext', manifestFor('global-allowed-ext'));
      createdSourceRepos.push(src);
      try {
        const res = await extensionsRoutes.install(
          makeReq(`${PREFIX}/install`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: src, scope: 'global' }),
          }),
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as { ok: boolean; extension: { scope: string } };
        expect(data.extension.scope).toBe('global');
      } finally {
        const globalPath = getGlobalExtensionPath('global-allowed-ext');
        try {
          rmSync(globalPath, { recursive: true, force: true });
        } catch {
          // already cleaned
        }
      }
    });

    it('rejects install body missing url (400)', async () => {
      const res = await extensionsRoutes.install(
        makeReq(`${PREFIX}/install`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope: 'user' }),
        }),
      );
      expect(res.status).toBe(400);
    });
  });

  describe('uninstall', () => {
    it('returns 404 for unknown id', async () => {
      const res = await extensionsRoutes.uninstall(
        makeReq(`${PREFIX}/uninstall`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 'no-such-ext' }),
        }),
      );
      expect(res.status).toBe(404);
    });

    it('rejects uninstall of global extension when admin gate not set (403)', async () => {
      delete process.env.WORLDCORE_ALLOW_ADMIN_GLOBAL_INSTALL;
      await insertRowDirect('global-uninstall', 'global');
      mkdirSync(getGlobalExtensionPath('global-uninstall'), { recursive: true });
      try {
        const res = await extensionsRoutes.uninstall(
          makeReq(`${PREFIX}/uninstall`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: 'global-uninstall' }),
          }),
        );
        expect(res.status).toBe(403);
      } finally {
        try {
          rmSync(getGlobalExtensionPath('global-uninstall'), { recursive: true, force: true });
        } catch {
          // already gone
        }
      }
    });

    it('uninstalls user-scoped extension when found', async () => {
      const src = createSourceRepo('uninstall-flow-ext', manifestFor('uninstall-flow-ext'));
      createdSourceRepos.push(src);
      const installRes = await extensionsRoutes.install(
        makeReq(`${PREFIX}/install`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: src, scope: 'user' }),
        }),
      );
      expect(installRes.status).toBe(200);

      const res = await extensionsRoutes.uninstall(
        makeReq(`${PREFIX}/uninstall`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 'uninstall-flow-ext' }),
        }),
      );
      expect(res.status).toBe(200);
      const rows = await db
        .select()
        .from(extensions)
        .where(eq(extensions.id, 'uninstall-flow-ext'));
      expect(rows.length).toBe(0);
    });
  });

  describe('enable / disable', () => {
    it('enables a disabled extension', async () => {
      await insertRowDirect('toggle-ext', 'user', { enabled: false });
      const res = await extensionsRoutes.enable(
        makeReq(`${PREFIX}/enable`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 'toggle-ext' }),
        }),
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as { ok: boolean; extension: { enabled: boolean } };
      expect(data.extension.enabled).toBe(true);
    });

    it('disables an enabled extension', async () => {
      await insertRowDirect('toggle-ext-2', 'user', { enabled: true });
      const res = await extensionsRoutes.disable(
        makeReq(`${PREFIX}/disable`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 'toggle-ext-2' }),
        }),
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as { ok: boolean; extension: { enabled: boolean } };
      expect(data.extension.enabled).toBe(false);
    });

    it('returns 400 when missing id', async () => {
      const res = await extensionsRoutes.enable(
        makeReq(`${PREFIX}/enable`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }),
      );
      expect(res.status).toBe(400);
    });
  });

  describe('patchSettings / getSettings', () => {
    it('patches a key and getSettings returns it', async () => {
      await insertRowDirect('settings-ext', 'user', { settings: { existing: 'kept' } });

      const patchRes = await extensionsRoutes.patchSettings(
        makeReq(`${PREFIX}/patch-settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 'settings-ext', key: 'foo', value: 'bar' }),
        }),
      );
      expect(patchRes.status).toBe(200);
      const patchData = (await patchRes.json()) as {
        ok: boolean;
        settings: Record<string, unknown>;
      };
      expect(patchData.settings.foo).toBe('bar');
      expect(patchData.settings.existing).toBe('kept');

      const getRes = await extensionsRoutes.getSettings(
        makeReq(`${PREFIX}/get-settings?id=settings-ext`, { method: 'POST' }),
      );
      expect(getRes.status).toBe(200);
      const getData = (await getRes.json()) as {
        ok: boolean;
        settings: Record<string, unknown>;
      };
      expect(getData.settings.foo).toBe('bar');
      expect(getData.settings.existing).toBe('kept');
    });

    it('patchSettings rejects empty key (400)', async () => {
      await insertRowDirect('settings-bad', 'user');
      const res = await extensionsRoutes.patchSettings(
        makeReq(`${PREFIX}/patch-settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 'settings-bad', key: '', value: 'x' }),
        }),
      );
      expect(res.status).toBe(400);
    });

    it('getSettings 400 when missing id', async () => {
      const res = await extensionsRoutes.getSettings(
        makeReq(`${PREFIX}/get-settings`, { method: 'POST' }),
      );
      expect(res.status).toBe(400);
    });
  });

  describe('serveAsset', () => {
    it('returns 404 for unknown extension id', async () => {
      const res = await extensionsRoutes.serveAsset(
        makeReq(`${PREFIX}/assets/unknown-ext/index.tsx`, { method: 'GET' }),
      );
      expect(res.status).toBe(404);
    });

    it('serves a real file from user-scope extension with correct MIME', async () => {
      await insertRowDirect('asset-ext', 'user');
      const dir = getUserExtensionPath('default-user', 'asset-ext');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'index.js'), 'export default function App(){return null}');
      try {
        const res = await extensionsRoutes.serveAsset(
          makeReq(`${PREFIX}/assets/asset-ext/index.js`, { method: 'GET' }),
        );
        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Type')).toBe('application/javascript');
        const body = await res.text();
        expect(body).toContain('export default function App');
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('returns 404 for missing asset file', async () => {
      await insertRowDirect('empty-ext', 'user');
      const dir = getUserExtensionPath('default-user', 'empty-ext');
      mkdirSync(dir, { recursive: true });
      try {
        const res = await extensionsRoutes.serveAsset(
          makeReq(`${PREFIX}/assets/empty-ext/missing.js`, { method: 'GET' }),
        );
        expect(res.status).toBe(404);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('returns 404 for malformed asset URLs without extId/relPath', async () => {
      const res = await extensionsRoutes.serveAsset(
        makeReq(`${PREFIX}/assets/just-id-no-slash`, { method: 'GET' }),
      );
      expect(res.status).toBe(404);
    });

    it('serves a CSS asset with text/css MIME', async () => {
      await insertRowDirect('asset-css-ext', 'user');
      const dir = getUserExtensionPath('default-user', 'asset-css-ext');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'styles.css'), '.root { color: red; }');
      try {
        const res = await extensionsRoutes.serveAsset(
          makeReq(`${PREFIX}/assets/asset-css-ext/styles.css`, { method: 'GET' }),
        );
        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Type')).toBe('text/css');
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });
});
