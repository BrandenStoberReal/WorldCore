import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { db } from '../../../src/server/db/client';
import { extensions } from '../../../src/server/db/schema';
import { eq } from 'drizzle-orm';
import {
  listExtensions,
  getExtension,
  installExtension,
  uninstallExtension,
  updateExtension,
  updateAllExtensions,
  toggleExtension,
  patchSettings,
  getSettings,
  validateManifest,
} from '../../../src/server/services/extensions.service';
import { ValidationError, NotFoundError, ConflictError } from '../../../src/server/errors';
import type { Manifest } from '../../../src/shared/types/extensions';

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
  const baseDir = mkdtempSync(join(tmpdir(), 'wc-ext-src-'));
  const dir = join(baseDir, extId);
  mkdirSync(dir, { recursive: true });
  git(['init', '-b', 'main', dir]);
  const manifestData = {
    id: extId,
    displayName: `Display ${extId}`,
    version: '1.0.0',
    author: 'test-author',
    description: 'Test extension',
    dependencies: [],
    peerDependencies: [],
    js: 'index.tsx',
    loadingOrder: 100,
    ...manifest,
  };
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifestData, null, 2));
  if (files) {
    for (const [name, content] of Object.entries(files)) {
      writeFileSync(join(dir, name), content);
    }
  }
  git(['add', '.'], { cwd: dir });
  git(['commit', '-m', 'init', '--no-gpg-sign'], { cwd: dir });
  return dir;
}

async function cleanExtRows(): Promise<void> {
  await db.delete(extensions);
}

describe('validateManifest', () => {
  it('accepts a valid manifest object', () => {
    const result = validateManifest({
      id: 'test-ext',
      displayName: 'Test Extension',
      version: '1.0.0',
      author: 'tester',
      description: 'A test',
    });
    expect(result.id).toBe('test-ext');
    expect(result.displayName).toBe('Test Extension');
    expect(result.version).toBe('1.0.0');
  });

  it('rejects non-object input', () => {
    expect(() => validateManifest('not an object')).toThrow(ValidationError);
  });

  it('rejects manifest with invalid id format', () => {
    expect(() =>
      validateManifest({
        id: 'INVALID_ID',
        displayName: 'Test',
        version: '1.0.0',
        author: 'tester',
      }),
    ).toThrow(ValidationError);
  });

  it('rejects manifest with empty id', () => {
    expect(() =>
      validateManifest({
        id: '',
        displayName: 'Test',
        version: '1.0.0',
        author: 'tester',
      }),
    ).toThrow(ValidationError);
  });

  it('rejects manifest with non-empty peerDependencies', () => {
    expect(() =>
      validateManifest({
        id: 'test-ext',
        displayName: 'Test',
        version: '1.0.0',
        author: 'tester',
        peerDependencies: ['some-dep'],
      }),
    ).toThrow(ValidationError);
  });
});

describe('listExtensions', () => {
  beforeEach(async () => {
    await cleanExtRows();
  });

  it('returns empty array when no extensions exist', async () => {
    const result = await listExtensions('user1');
    expect(result).toEqual([]);
  });

  it('returns user-scoped extensions for a user', async () => {
    await db.insert(extensions).values({
      id: 'ext-a',
      name: 'ext-a',
      displayName: 'Extension A',
      version: '1.0.0',
      author: 'author',
      description: '',
      gitUrl: null,
      branch: null,
      scope: 'user',
      enabled: true,
      settings: {},
      manifestCache: null,
      installedAt: null,
      lastUpdatedAt: null,
      userId: 'user1',
    });
    const result = await listExtensions('user1');
    expect(result.length).toBe(1);
    expect(result[0]!.id).toBe('ext-a');
  });

  it('merges global extensions into user list', async () => {
    await db.insert(extensions).values({
      id: 'global-ext',
      name: 'global-ext',
      displayName: 'Global Ext',
      version: '1.0.0',
      author: 'author',
      description: '',
      gitUrl: null,
      branch: null,
      scope: 'global',
      enabled: true,
      settings: {},
      manifestCache: null,
      installedAt: null,
      lastUpdatedAt: null,
      userId: 'default-user',
    });
    await db.insert(extensions).values({
      id: 'user-ext',
      name: 'user-ext',
      displayName: 'User Ext',
      version: '1.0.0',
      author: 'author',
      description: '',
      gitUrl: null,
      branch: null,
      scope: 'user',
      enabled: true,
      settings: {},
      manifestCache: null,
      installedAt: null,
      lastUpdatedAt: null,
      userId: 'user1',
    });
    const result = await listExtensions('user1');
    expect(result.length).toBe(2);
    const ids = result.map((r) => r.id).sort();
    expect(ids).toEqual(['global-ext', 'user-ext']);
  });

  it('user extension wins over global on id collision', async () => {
    await db.insert(extensions).values({
      id: 'shared-ext',
      name: 'shared-ext',
      displayName: 'Global Version',
      version: '1.0.0',
      author: 'author',
      description: '',
      gitUrl: null,
      branch: null,
      scope: 'global',
      enabled: true,
      settings: {},
      manifestCache: null,
      installedAt: null,
      lastUpdatedAt: null,
      userId: 'default-user',
    });
    await db.delete(extensions).where(eq(extensions.id, 'shared-ext'));
    await db.insert(extensions).values({
      id: 'shared-ext',
      name: 'shared-ext',
      displayName: 'User Version',
      version: '2.0.0',
      author: 'author',
      description: '',
      gitUrl: null,
      branch: null,
      scope: 'user',
      enabled: false,
      settings: {},
      manifestCache: null,
      installedAt: null,
      lastUpdatedAt: null,
      userId: 'user1',
    });
    const result = await listExtensions('user1');
    expect(result.length).toBe(1);
    expect(result[0]!.displayName).toBe('User Version');
    expect(result[0]!.version).toBe('2.0.0');
    expect(result[0]!.enabled).toBe(false);
  });

  it('does not return other users extensions', async () => {
    await db.insert(extensions).values({
      id: 'ext-b',
      name: 'ext-b',
      displayName: 'Extension B',
      version: '1.0.0',
      author: 'author',
      description: '',
      gitUrl: null,
      branch: null,
      scope: 'user',
      enabled: true,
      settings: {},
      manifestCache: null,
      installedAt: null,
      lastUpdatedAt: null,
      userId: 'user2',
    });
    const result = await listExtensions('user1');
    expect(result.length).toBe(0);
  });
});

describe('getExtension', () => {
  beforeEach(async () => {
    await cleanExtRows();
  });

  it('returns null when extension not found', async () => {
    const result = await getExtension('user1', 'nonexistent');
    expect(result).toBeNull();
  });

  it('returns user extension by id', async () => {
    await db.insert(extensions).values({
      id: 'my-ext',
      name: 'my-ext',
      displayName: 'My Extension',
      version: '1.0.0',
      author: 'author',
      description: 'desc',
      gitUrl: 'https://example.com/ext.git',
      branch: 'main',
      scope: 'user',
      enabled: true,
      settings: { theme: 'dark' },
      manifestCache: { id: 'my-ext' },
      installedAt: '2026-01-01T00:00:00.000Z',
      lastUpdatedAt: '2026-01-01T00:00:00.000Z',
      userId: 'user1',
    });
    const result = await getExtension('user1', 'my-ext');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('my-ext');
    expect(result!.displayName).toBe('My Extension');
  });

  it('returns global extension for a user', async () => {
    await db.insert(extensions).values({
      id: 'g-ext',
      name: 'g-ext',
      displayName: 'Global Extension',
      version: '1.0.0',
      author: 'author',
      description: '',
      gitUrl: null,
      branch: null,
      scope: 'global',
      enabled: true,
      settings: {},
      manifestCache: null,
      installedAt: null,
      lastUpdatedAt: null,
      userId: 'default-user',
    });
    const result = await getExtension('user1', 'g-ext');
    expect(result).not.toBeNull();
    expect(result!.scope).toBe('global');
  });

  it('returns null for other users extension', async () => {
    await db.insert(extensions).values({
      id: 'other-ext',
      name: 'other-ext',
      displayName: 'Other',
      version: '1.0.0',
      author: 'author',
      description: '',
      gitUrl: null,
      branch: null,
      scope: 'user',
      enabled: true,
      settings: {},
      manifestCache: null,
      installedAt: null,
      lastUpdatedAt: null,
      userId: 'user2',
    });
    const result = await getExtension('user1', 'other-ext');
    expect(result).toBeNull();
  });
});

describe('installExtension', () => {
  let srcDir: string;

  afterEach(async () => {
    await cleanExtRows();
    if (srcDir) {
      const parent = dirname(srcDir);
      rmSync(srcDir, { recursive: true, force: true });
      rmSync(parent, { recursive: true, force: true });
      srcDir = undefined!;
    }
  });

  it('installs a user-scoped extension from a git repo', async () => {
    srcDir = createSourceRepo('test-install-ext', {
      displayName: 'Test Install',
      version: '1.0.0',
    });
    const row = await installExtension('user1', { url: srcDir, scope: 'user' });
    expect(row.id).toBe('test-install-ext');
    expect(row.displayName).toBe('Test Install');
    expect(row.version).toBe('1.0.0');
    expect(row.scope).toBe('user');
    expect(row.enabled).toBe(true);
    expect(row.userId).toBe('user1');
    expect(row.gitUrl).toBe(srcDir);
    expect(row.settings).toEqual({});
  });

  it('installs a global-scoped extension', async () => {
    srcDir = createSourceRepo('global-install-ext', {
      displayName: 'Global Install',
    });
    const row = await installExtension('user1', { url: srcDir, scope: 'global' });
    expect(row.scope).toBe('global');
    expect(row.userId).toBe('default-user');
  });

  it('throws ConflictError if extension already installed (same id)', async () => {
    srcDir = createSourceRepo('conflict-ext', {});
    await installExtension('user1', { url: srcDir, scope: 'user' });
    const srcDir2 = createSourceRepo('conflict-ext', {});
    await expect(installExtension('user1', { url: srcDir2, scope: 'user' })).rejects.toThrow(
      ConflictError,
    );
    rmSync(dirname(srcDir2), { recursive: true, force: true });
  });

  it('throws ValidationError for invalid git URL', async () => {
    await expect(
      installExtension('user1', { url: 'file:///etc/passwd', scope: 'user' }),
    ).rejects.toThrow(ValidationError);
  });

  it('rejects manifest with non-empty peerDependencies', async () => {
    srcDir = createSourceRepo('peer-dep-ext', { peerDependencies: ['some-dep'] });
    await expect(installExtension('user1', { url: srcDir, scope: 'user' })).rejects.toThrow(
      ValidationError,
    );
  });

  it('rejects manifest.id not matching folder basename', async () => {
    srcDir = createSourceRepo('folder-name', { id: 'different-id' });
    await expect(installExtension('user1', { url: srcDir, scope: 'user' })).rejects.toThrow(
      ValidationError,
    );
  });

  it('creates the extension directory on disk', async () => {
    srcDir = createSourceRepo('dir-check-ext', {});
    const row = await installExtension('user1', { url: srcDir, scope: 'user' });
    const extPath = join(process.env.WORLDCORE_DATA_ROOT!, 'user1', 'extensions', row.id);
    const extStat = await import('node:fs/promises').then((fsp) => fsp.stat(extPath));
    expect(extStat.isDirectory()).toBe(true);
  });
});

describe('uninstallExtension', () => {
  beforeEach(async () => {
    await cleanExtRows();
  });

  it('throws NotFoundError for nonexistent extension', async () => {
    await expect(uninstallExtension('user1', 'nonexistent')).rejects.toThrow(NotFoundError);
  });

  it('removes DB row and directory for user extension', async () => {
    const extPath = join(process.env.WORLDCORE_DATA_ROOT!, 'user1', 'extensions', 'rm-ext');
    mkdirSync(extPath, { recursive: true });
    writeFileSync(join(extPath, 'file.txt'), 'hello');

    await db.insert(extensions).values({
      id: 'rm-ext',
      name: 'rm-ext',
      displayName: 'Remove Me',
      version: '1.0.0',
      author: '',
      description: '',
      gitUrl: null,
      branch: null,
      scope: 'user',
      enabled: true,
      settings: {},
      manifestCache: null,
      installedAt: null,
      lastUpdatedAt: null,
      userId: 'user1',
    });

    await uninstallExtension('user1', 'rm-ext');

    const row = await db.select().from(extensions).where(eq(extensions.id, 'rm-ext'));
    expect(row.length).toBe(0);

    const { existsSync } = await import('node:fs');
    expect(existsSync(extPath)).toBe(false);
  });

  it('removes global extension (admin check is route-layer)', async () => {
    const extPath = join(process.env.WORLDCORE_DATA_ROOT!, 'extensions', 'g-rm-ext');
    mkdirSync(extPath, { recursive: true });

    await db.insert(extensions).values({
      id: 'g-rm-ext',
      name: 'g-rm-ext',
      displayName: 'Global Remove',
      version: '1.0.0',
      author: '',
      description: '',
      gitUrl: null,
      branch: null,
      scope: 'global',
      enabled: true,
      settings: {},
      manifestCache: null,
      installedAt: null,
      lastUpdatedAt: null,
      userId: 'default-user',
    });

    await uninstallExtension('user1', 'g-rm-ext');

    const row = await db.select().from(extensions).where(eq(extensions.id, 'g-rm-ext'));
    expect(row.length).toBe(0);

    const { existsSync } = await import('node:fs');
    expect(existsSync(extPath)).toBe(false);
  });
});

describe('updateExtension', () => {
  let srcDir: string;

  beforeEach(async () => {
    await cleanExtRows();
  });

  afterEach(() => {
    if (srcDir) {
      const parent = dirname(srcDir);
      rmSync(srcDir, { recursive: true, force: true });
      rmSync(parent, { recursive: true, force: true });
      srcDir = undefined!;
    }
  });

  it('throws NotFoundError for nonexistent extension', async () => {
    await expect(updateExtension('user1', 'nonexistent')).rejects.toThrow(NotFoundError);
  });

  it('pulls new changes and updates DB row', async () => {
    srcDir = createSourceRepo('update-ext', { version: '1.0.0' });
    const installed = await installExtension('user1', { url: srcDir, scope: 'user' });

    const updatedRow = await updateExtension('user1', 'update-ext');
    expect(updatedRow.id).toBe('update-ext');
    expect(updatedRow.lastUpdatedAt).not.toBe(installed.lastUpdatedAt);
  });

  it('updates global extension', async () => {
    srcDir = createSourceRepo('update-global-ext', { version: '1.0.0' });
    await installExtension('user1', { url: srcDir, scope: 'global' });

    const updated = await updateExtension('user1', 'update-global-ext');
    expect(updated.id).toBe('update-global-ext');
  });
});

describe('updateAllExtensions', () => {
  let srcDir: string;

  beforeEach(async () => {
    await cleanExtRows();
  });

  afterEach(() => {
    if (srcDir) {
      const parent = dirname(srcDir);
      rmSync(srcDir, { recursive: true, force: true });
      rmSync(parent, { recursive: true, force: true });
      srcDir = undefined!;
    }
  });

  it('returns empty when no extensions installed', async () => {
    const result = await updateAllExtensions('user1');
    expect(result.updated).toEqual([]);
    expect(result.failed).toEqual([]);
  });

  it('updates all user extensions and reports failures', async () => {
    srcDir = createSourceRepo('updateall-ext', { version: '1.0.0' });
    await installExtension('user1', { url: srcDir, scope: 'user' });

    const result = await updateAllExtensions('user1');
    expect(result.updated.length).toBe(1);
    expect(result.updated[0]).toBe('updateall-ext');
    expect(result.failed.length).toBe(0);
  });
});

describe('toggleExtension', () => {
  beforeEach(async () => {
    await cleanExtRows();
  });

  it('throws NotFoundError for nonexistent extension', async () => {
    await expect(toggleExtension('user1', 'nonexistent', false)).rejects.toThrow(NotFoundError);
  });

  it('disables an enabled extension', async () => {
    await db.insert(extensions).values({
      id: 'toggle-ext',
      name: 'toggle-ext',
      displayName: 'Toggle',
      version: '1.0.0',
      author: '',
      description: '',
      gitUrl: null,
      branch: null,
      scope: 'user',
      enabled: true,
      settings: {},
      manifestCache: null,
      installedAt: null,
      lastUpdatedAt: null,
      userId: 'user1',
    });
    const result = await toggleExtension('user1', 'toggle-ext', false);
    expect(result.enabled).toBe(false);
  });

  it('enables a disabled extension', async () => {
    await db.insert(extensions).values({
      id: 'toggle-ext2',
      name: 'toggle-ext2',
      displayName: 'Toggle2',
      version: '1.0.0',
      author: '',
      description: '',
      gitUrl: null,
      branch: null,
      scope: 'user',
      enabled: false,
      settings: {},
      manifestCache: null,
      installedAt: null,
      lastUpdatedAt: null,
      userId: 'user1',
    });
    const result = await toggleExtension('user1', 'toggle-ext2', true);
    expect(result.enabled).toBe(true);
  });

  it('toggles global extension', async () => {
    await db.insert(extensions).values({
      id: 'g-toggle',
      name: 'g-toggle',
      displayName: 'Global Toggle',
      version: '1.0.0',
      author: '',
      description: '',
      gitUrl: null,
      branch: null,
      scope: 'global',
      enabled: true,
      settings: {},
      manifestCache: null,
      installedAt: null,
      lastUpdatedAt: null,
      userId: 'default-user',
    });
    const result = await toggleExtension('user1', 'g-toggle', false);
    expect(result.enabled).toBe(false);
  });
});

describe('patchSettings', () => {
  beforeEach(async () => {
    await cleanExtRows();
  });

  it('throws NotFoundError for nonexistent extension', async () => {
    await expect(patchSettings('user1', 'nonexistent', 'key', 'val')).rejects.toThrow(
      NotFoundError,
    );
  });

  it('adds a new setting key', async () => {
    await db.insert(extensions).values({
      id: 'patch-ext',
      name: 'patch-ext',
      displayName: 'Patch',
      version: '1.0.0',
      author: '',
      description: '',
      gitUrl: null,
      branch: null,
      scope: 'user',
      enabled: true,
      settings: {},
      manifestCache: null,
      installedAt: null,
      lastUpdatedAt: null,
      userId: 'user1',
    });
    await patchSettings('user1', 'patch-ext', 'theme', 'dark');
    const settings = await getSettings('user1', 'patch-ext');
    expect(settings).toEqual({ theme: 'dark' });
  });

  it('updates an existing setting key', async () => {
    await db.insert(extensions).values({
      id: 'patch-ext2',
      name: 'patch-ext2',
      displayName: 'Patch2',
      version: '1.0.0',
      author: '',
      description: '',
      gitUrl: null,
      branch: null,
      scope: 'user',
      enabled: true,
      settings: { theme: 'light' },
      manifestCache: null,
      installedAt: null,
      lastUpdatedAt: null,
      userId: 'user1',
    });
    await patchSettings('user1', 'patch-ext2', 'theme', 'dark');
    const settings = await getSettings('user1', 'patch-ext2');
    expect(settings).toEqual({ theme: 'dark' });
  });

  it('patches global extension settings', async () => {
    await db.insert(extensions).values({
      id: 'g-patch',
      name: 'g-patch',
      displayName: 'Global Patch',
      version: '1.0.0',
      author: '',
      description: '',
      gitUrl: null,
      branch: null,
      scope: 'global',
      enabled: true,
      settings: {},
      manifestCache: null,
      installedAt: null,
      lastUpdatedAt: null,
      userId: 'default-user',
    });
    await patchSettings('user1', 'g-patch', 'lang', 'en');
    const settings = await getSettings('user1', 'g-patch');
    expect(settings).toEqual({ lang: 'en' });
  });
});

describe('getSettings', () => {
  beforeEach(async () => {
    await cleanExtRows();
  });

  it('throws NotFoundError for nonexistent extension', async () => {
    await expect(getSettings('user1', 'nonexistent')).rejects.toThrow(NotFoundError);
  });

  it('returns empty object when no settings', async () => {
    await db.insert(extensions).values({
      id: 'no-settings-ext',
      name: 'no-settings-ext',
      displayName: 'No Settings',
      version: '1.0.0',
      author: '',
      description: '',
      gitUrl: null,
      branch: null,
      scope: 'user',
      enabled: true,
      settings: {},
      manifestCache: null,
      installedAt: null,
      lastUpdatedAt: null,
      userId: 'user1',
    });
    const result = await getSettings('user1', 'no-settings-ext');
    expect(result).toEqual({});
  });

  it('returns existing settings', async () => {
    await db.insert(extensions).values({
      id: 'settings-ext',
      name: 'settings-ext',
      displayName: 'Settings',
      version: '1.0.0',
      author: '',
      description: '',
      gitUrl: null,
      branch: null,
      scope: 'user',
      enabled: true,
      settings: { key1: 'val1', key2: 42 },
      manifestCache: null,
      installedAt: null,
      lastUpdatedAt: null,
      userId: 'user1',
    });
    const result = await getSettings('user1', 'settings-ext');
    expect(result).toEqual({ key1: 'val1', key2: 42 });
  });
});
