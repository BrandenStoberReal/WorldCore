import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { db } from '@/server/db/client';
import { extensions } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import {
  seedPreinstalledGlobalExtensions,
  listExtensions,
} from '@/server/services/extensions.service';
import { getGlobalExtensionRoot, DATA_ROOT } from '@/server/storage/paths';

function writeManifest(extId: string, manifest: Record<string, unknown>): void {
  const dir = path.join(getGlobalExtensionRoot(), extId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, 'manifest.json'),
    JSON.stringify({
      id: extId,
      displayName: `Display ${extId}`,
      version: '1.0.0',
      author: 'tester',
      description: '',
      js: 'index.js',
      loadingOrder: 100,
      dependencies: [],
      peerDependencies: [],
      ...manifest,
    }),
  );
}

async function cleanRows(): Promise<void> {
  await db.delete(extensions);
}

function cleanDir(extId: string): void {
  try {
    rmSync(path.join(getGlobalExtensionRoot(), extId), { recursive: true, force: true });
  } catch {
    // already gone
  }
}

describe('seedPreinstalledGlobalExtensions', () => {
  beforeEach(async () => {
    await cleanRows();
    cleanDir('seed-ext-a');
    cleanDir('seed-ext-b');
    cleanDir('seed-bad-manifest');
    cleanDir('seed-id-mismatch');
    cleanDir('seed-no-manifest');
  });
  afterEach(async () => {
    await cleanRows();
    cleanDir('seed-ext-a');
    cleanDir('seed-ext-b');
    cleanDir('seed-bad-manifest');
    cleanDir('seed-id-mismatch');
    cleanDir('seed-no-manifest');
  });

  it('upserts DB rows for valid global extension dirs', async () => {
    writeManifest('seed-ext-a', { displayName: 'Alpha', version: '1.0.0' });
    writeManifest('seed-ext-b', { displayName: 'Beta', version: '2.0.0' });
    await seedPreinstalledGlobalExtensions();

    const rows = await listExtensions('default-user');
    const ids = rows.map((r) => r.id).sort();
    expect(ids).toContain('seed-ext-a');
    expect(ids).toContain('seed-ext-b');

    const a = rows.find((r) => r.id === 'seed-ext-a');
    expect(a?.scope).toBe('global');
    expect(a?.displayName).toBe('Alpha');
    expect(a?.enabled).toBe(true);
  });

  it('preserves enabled flag for already-installed rows', async () => {
    writeManifest('seed-ext-a', { displayName: 'Alpha v1', version: '1.0.0' });
    await seedPreinstalledGlobalExtensions();

    const before = (await listExtensions('default-user')).find((r) => r.id === 'seed-ext-a');
    expect(before?.enabled).toBe(true);
    expect(before?.displayName).toBe('Alpha v1');

    await db.update(extensions).set({ enabled: false }).where(eq(extensions.id, 'seed-ext-a'));

    writeManifest('seed-ext-a', { displayName: 'Alpha v2', version: '1.1.0' });
    await seedPreinstalledGlobalExtensions();

    const after = (await listExtensions('default-user')).find((r) => r.id === 'seed-ext-a');
    expect(after?.enabled).toBe(false);
    expect(after?.displayName).toBe('Alpha v2');
    expect(after?.version).toBe('1.1.0');
  });

  it('skips invalid manifest JSON without raising', async () => {
    const dir = path.join(getGlobalExtensionRoot(), 'seed-bad-manifest');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'manifest.json'), '{ not valid json');
    await seedPreinstalledGlobalExtensions();
    const rows = await listExtensions('default-user');
    expect(rows.find((r) => r.id === 'seed-bad-manifest')).toBeUndefined();
  });

  it('skips dirs with manifest.id not matching folder name', async () => {
    const dir = path.join(getGlobalExtensionRoot(), 'seed-id-mismatch');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, 'manifest.json'),
      JSON.stringify({
        id: 'different-id',
        displayName: 'Mismatch',
        version: '1.0.0',
        author: 'tester',
      }),
    );
    await seedPreinstalledGlobalExtensions();
    const rows = await listExtensions('default-user');
    expect(rows.find((r) => r.id === 'seed-id-mismatch')).toBeUndefined();
  });

  it('skips dirs without manifest.json', async () => {
    const dir = path.join(getGlobalExtensionRoot(), 'seed-no-manifest');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'index.js'), '// no manifest');
    await seedPreinstalledGlobalExtensions();
    const rows = await listExtensions('default-user');
    expect(rows.find((r) => r.id === 'seed-no-manifest')).toBeUndefined();
  });

  it('is a no-op when global extension root is missing', async () => {
    const fakeRoot = path.join(DATA_ROOT, 'missing-root-for-seed-test');
    rmSync(fakeRoot, { recursive: true, force: true });
    const original = process.env.WORLDCORE_DATA_ROOT;
    process.env.WORLDCORE_DATA_ROOT = path.dirname(fakeRoot);
    try {
      await expect(seedPreinstalledGlobalExtensions()).resolves.toBeUndefined();
    } finally {
      process.env.WORLDCORE_DATA_ROOT = original;
    }
  });
});
