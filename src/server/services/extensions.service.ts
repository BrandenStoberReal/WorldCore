import fs from 'node:fs/promises';
import { mkdtempSync, existsSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { db } from '@/server/db/client';
import { extensions } from '@/server/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import {
  getGlobalExtensionPath,
  getGlobalExtensionRoot,
  getUserExtensionPath,
  DATA_ROOT,
} from '@/server/storage/paths';
import { cloneRepo, fetchAndPull, validateGitUrl, rmrf, getDefaultBranch } from '@/server/services/gitClone.service';
import { ManifestSchema, ExtensionRowSchema } from '@/shared/schemas/extensions';
import { NotFoundError, ValidationError, ConflictError } from '@/server/errors';
import type { Manifest } from '@/shared/types/extensions';
import type { ExtensionRow, InstallExtensionInput } from '@/shared/types/extensions';
import { ZodError } from 'zod';
import { log } from '@/server/logger';
import { emit } from '@/lib/extensionEventBus';

const DIST_EXTENSIONS_DIR = path.join(process.cwd(), 'dist', 'extensions');

export async function buildExtension(extDir: string, extId: string): Promise<boolean> {
  const manifestPath = path.join(extDir, 'manifest.json');
  if (!existsSync(manifestPath)) return false;

  let manifest: { js?: string; css?: string };
  try {
    manifest = JSON.parse(await Bun.file(manifestPath).text());
  } catch {
    log.warn('ext', `buildExtension: skipping "${extId}" (unreadable manifest)`);
    return false;
  }
  if (!manifest.js || !manifest.js.trim()) {
    log.warn('ext', `buildExtension: skipping "${extId}" (no js entrypoint)`);
    return false;
  }

  const entry = path.join(extDir, manifest.js);
  if (!existsSync(entry)) {
    log.warn('ext', `buildExtension: skipping "${extId}" (entrypoint ${manifest.js} missing)`);
    return false;
  }

  const extOutDir = path.join(DIST_EXTENSIONS_DIR, extId);
  await fs.mkdir(extOutDir, { recursive: true });

  const extResult = await Bun.build({
    entrypoints: [entry],
    outdir: extOutDir,
    target: 'browser',
    minify: true,
    sourcemap: 'external',
    naming: 'index.js',
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
  });

  if (!extResult.success) {
    for (const logEntry of extResult.logs) {
      log.error('ext', `buildExtension:${extId}:`, logEntry.message ?? logEntry);
    }
    return false;
  }

  if (manifest.css && existsSync(path.join(extDir, manifest.css))) {
    await fs.copyFile(
      path.join(extDir, manifest.css),
      path.join(extOutDir, manifest.css),
    );
  }

  return true;
}

function extractSlug(url: string): string {
  let raw = url;
  if (/^[a-z]+:\/\//i.test(url)) {
    raw = new URL(url).pathname;
  }
  return path.basename(raw, '.git');
}

function scopeUserId(scope: string, userId: string): string {
  return scope === 'global' ? 'default-user' : userId;
}

function scopeDir(scope: string, userId: string, extId: string): string {
  return scope === 'global' ? getGlobalExtensionPath(extId) : getUserExtensionPath(userId, extId);
}

function rowToExtension(row: typeof extensions.$inferSelect): ExtensionRow {
  return ExtensionRowSchema.parse(row);
}

export function validateManifest(manifestObj: unknown): Manifest {
  let parsed: Manifest;
  try {
    parsed = ManifestSchema.parse(manifestObj);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new ValidationError(err.format());
    }
    throw err;
  }
  if (parsed.peerDependencies.length > 0) {
    throw new ValidationError('peerDependencies unsupported in v1');
  }
  return parsed;
}

export async function listExtensions(userId: string): Promise<ExtensionRow[]> {
  const userRows = await db.select().from(extensions).where(eq(extensions.userId, userId));

  const globalRows = await db
    .select()
    .from(extensions)
    .where(and(eq(extensions.scope, 'global'), eq(extensions.userId, 'default-user')));

  const map = new Map<string, typeof extensions.$inferSelect>();
  for (const row of globalRows) {
    map.set(row.id, row);
  }
  for (const row of userRows) {
    map.set(row.id, row);
  }
  return Array.from(map.values()).map(rowToExtension);
}

export async function getExtension(userId: string, id: string): Promise<ExtensionRow | null> {
  const row = await db.select().from(extensions).where(eq(extensions.id, id)).limit(1);

  if (row.length === 0) return null;
  const r = row[0]!;
  if (r.scope === 'global') {
    if (r.userId === 'default-user') return rowToExtension(r);
    return null;
  }
  if (r.userId === userId) return rowToExtension(r);
  return null;
}

export async function installExtension(
  userId: string,
  input: InstallExtensionInput,
): Promise<ExtensionRow> {
  validateGitUrl(input.url);

  const slug = extractSlug(input.url);
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new ValidationError(`invalid extension slug: ${slug}`);
  }

  const scope = input.scope ?? 'user';
  const tempDest = mkdtempSync(path.join(tmpdir(), 'wc-ext-install-'));

  try {
    await cloneRepo(input.url, tempDest, { branch: input.branch, timeoutMs: 60000 });

    const subfolder = input.subfolder ?? null;
    const extRoot = subfolder ? path.join(tempDest, subfolder) : tempDest;
    const branch = input.branch ?? await getDefaultBranch(tempDest);
    const manifestPath = path.join(extRoot, 'manifest.json');
    const manifestText = await Bun.file(manifestPath).text();
    let manifestObj: unknown;
    try {
      manifestObj = JSON.parse(manifestText);
    } catch {
      throw new ValidationError('manifest.json is not valid JSON');
    }
    const parsed = validateManifest(manifestObj);

    if (!subfolder && parsed.id !== slug) {
      throw new ValidationError('manifest.id does not match folder name');
    }

    const dest = scopeDir(scope, userId, parsed.id);

    let destExists = false;
    try {
      await fs.access(dest);
      destExists = true;
    } catch {
      destExists = false;
    }
    if (destExists) {
      throw new ConflictError(`extension already installed: ${parsed.id}`);
    }

    const destParent = path.dirname(dest);
    await fs.mkdir(destParent, { recursive: true });

    try {
      await fs.rename(extRoot, dest);
      if (subfolder) {
        await rmrf(tempDest);
      }
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'EXDEV') {
        await fs.cp(extRoot, dest, { recursive: true });
        await rmrf(tempDest);
      } else {
        throw err;
      }
    }

    const timestamp = new Date().toISOString();
    const uid = scopeUserId(scope, userId);

    try {
      await db.insert(extensions).values({
        id: parsed.id,
        name: parsed.id,
        displayName: parsed.displayName,
        version: parsed.version,
        author: parsed.author,
        description: parsed.description,
        gitUrl: input.url,
        branch: input.branch ?? null,
        subfolder: subfolder,
        scope,
        enabled: true,
        settings: {},
        manifestCache: parsed,
        installedAt: timestamp,
        lastUpdatedAt: timestamp,
        userId: uid,
      });
    } catch (err) {
      try {
        await rmrf(dest);
      } catch {}
      throw err;
    }

    await buildExtension(dest, parsed.id);

    const inserted = await db
      .select()
      .from(extensions)
      .where(eq(extensions.id, parsed.id))
      .limit(1);

    return rowToExtension(inserted[0]!);
  } catch (err) {
    try {
      await rmrf(tempDest);
    } catch {}
    throw err;
  }
}

export async function uninstallExtension(userId: string, id: string): Promise<void> {
  const row = await db.select().from(extensions).where(eq(extensions.id, id)).limit(1);

  if (row.length === 0) {
    throw new NotFoundError(`Extension "${id}"`);
  }

  const r = row[0]!;
  const dir = scopeDir(r.scope, userId, id);

  if (r.scope === 'global') {
    await db
      .delete(extensions)
      .where(and(eq(extensions.id, id), eq(extensions.userId, 'default-user')));
  } else {
    await db.delete(extensions).where(and(eq(extensions.id, id), eq(extensions.userId, userId)));
  }

  try {
    await rmrf(dir);
  } catch (err) {
    log.warn(
      'ext',
      `uninstallExtension: failed to remove dir for "${id}" (DB row already deleted):`,
      err instanceof Error ? err.message : err,
    );
  }
}

export async function updateExtension(userId: string, id: string): Promise<ExtensionRow> {
  const existing = await getExtension(userId, id);
  if (!existing) {
    throw new NotFoundError(`Extension "${id}"`);
  }

  const dir = scopeDir(existing.scope, userId, id);
  const uid = scopeUserId(existing.scope, userId);
  const branch = existing.branch ?? await getDefaultBranch(dir);

  let parsed: Manifest;
  const timestamp = new Date().toISOString();

  if (existing.subfolder && existing.gitUrl) {
    const tempDest = mkdtempSync(path.join(tmpdir(), 'wc-ext-update-'));
    try {
      await cloneRepo(existing.gitUrl, tempDest, { branch, timeoutMs: 60000 });

      const extRoot = path.join(tempDest, existing.subfolder);
      const manifestPath = path.join(extRoot, 'manifest.json');
      const manifestText = await Bun.file(manifestPath).text();
      let manifestObj: unknown;
      try {
        manifestObj = JSON.parse(manifestText);
      } catch {
        throw new ValidationError('manifest.json is not valid JSON');
      }
      parsed = validateManifest(manifestObj);

      await fs.rm(dir, { recursive: true, force: true });
      await fs.cp(extRoot, dir, { recursive: true });
      await rmrf(tempDest);
    } catch (err) {
      try { await rmrf(tempDest); } catch {}
      throw err;
    }
  } else if (existing.gitUrl) {
    await fetchAndPull(dir, branch, { timeoutMs: 30000 });

    const manifestPath = path.join(dir, 'manifest.json');
    const manifestText = await Bun.file(manifestPath).text();
    let manifestObj: unknown;
    try {
      manifestObj = JSON.parse(manifestText);
    } catch {
      throw new ValidationError('manifest.json is not valid JSON');
    }
    parsed = validateManifest(manifestObj);
  } else {
    throw new ValidationError('extension has no git URL — cannot update');
  }

  await db
    .update(extensions)
    .set({
      branch: existing.branch ?? branch,
      version: parsed.version,
      manifestCache: parsed,
      hasUpdate: false,
      lastUpdatedAt: timestamp,
    })
    .where(and(eq(extensions.id, id), eq(extensions.userId, uid)));

  await buildExtension(dir, id);

  const updated = await db
    .select()
    .from(extensions)
    .where(and(eq(extensions.id, id), eq(extensions.userId, uid)))
    .limit(1);

  if (updated.length === 0) {
    throw new NotFoundError(`Extension "${id}"`);
  }
  return rowToExtension(updated[0]!);
}

export async function updateAllExtensions(
  userId: string,
): Promise<{ updated: string[]; failed: { id: string; error: string }[] }> {
  const userExtList = await listExtensions(userId);
  const updated: string[] = [];
  const failed: { id: string; error: string }[] = [];

  for (const ext of userExtList) {
    if (!ext.gitUrl) continue;
    try {
      await updateExtension(userId, ext.id);
      updated.push(ext.id);
    } catch (err) {
      failed.push({ id: ext.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return { updated, failed };
}

export async function toggleExtension(
  userId: string,
  id: string,
  enabled: boolean,
): Promise<ExtensionRow> {
  const existing = await getExtension(userId, id);
  if (!existing) {
    throw new NotFoundError(`Extension "${id}"`);
  }

  if (existing.scope === 'global') {
    if (!enabled) {
      const globalRow = await db
        .select()
        .from(extensions)
        .where(and(eq(extensions.id, id), eq(extensions.scope, 'global')))
        .limit(1);

      if (globalRow.length === 0) {
        throw new NotFoundError(`Extension "${id}"`);
      }
      const g = globalRow[0]!;

      const existingOverride = await db
        .select()
        .from(extensions)
        .where(and(eq(extensions.id, id), eq(extensions.userId, userId)))
        .limit(1);

      if (existingOverride.length > 0) {
        await db
          .update(extensions)
          .set({ enabled: false })
          .where(and(eq(extensions.id, id), eq(extensions.userId, userId)));
      } else {
        await db.insert(extensions).values({
          id: g.id,
          name: g.name,
          displayName: g.displayName,
          version: g.version,
          author: g.author,
          description: g.description,
          gitUrl: null,
          branch: null,
          subfolder: null,
          scope: 'user',
          enabled: false,
          settings: {},
          manifestCache: null,
          installedAt: null,
          lastUpdatedAt: null,
          userId,
        });
      }
    } else {
      await db.delete(extensions).where(and(eq(extensions.id, id), eq(extensions.userId, userId)));
    }

    const result = await getExtension(userId, id);
    if (!result) {
      throw new NotFoundError(`Extension "${id}"`);
    }
    emit(enabled ? 'ext_enabled' : 'ext_disabled', { id });
    return result;
  }

  const uid = scopeUserId(existing.scope, userId);

  await db
    .update(extensions)
    .set({ enabled })
    .where(and(eq(extensions.id, id), eq(extensions.userId, uid)));

  const updated = await db
    .select()
    .from(extensions)
    .where(and(eq(extensions.id, id), eq(extensions.userId, uid)))
    .limit(1);

  if (updated.length === 0) {
    throw new NotFoundError(`Extension "${id}"`);
  }
  emit(enabled ? 'ext_enabled' : 'ext_disabled', { id });
  return rowToExtension(updated[0]!);
}

export async function patchSettings(
  userId: string,
  id: string,
  key: string,
  value: unknown,
): Promise<void> {
  const existing = await getExtension(userId, id);
  if (!existing) {
    throw new NotFoundError(`Extension "${id}"`);
  }
  const uid = scopeUserId(existing.scope, userId);

  const current = (existing.settings as Record<string, unknown>) ?? {};
  const patched = { ...current, [key]: value };

  await db
    .update(extensions)
    .set({ settings: patched })
    .where(and(eq(extensions.id, id), eq(extensions.userId, uid)));
}

export async function getSettings(userId: string, id: string): Promise<unknown> {
  const existing = await getExtension(userId, id);
  if (!existing) {
    throw new NotFoundError(`Extension "${id}"`);
  }
  return existing.settings ?? {};
}

const DEFAULT_USER = 'default-user';

export class ExtensionsService {
  getExtensionsDirectory(): string {
    return path.join(DATA_ROOT, 'extensions');
  }

  async listExtensions(): Promise<ExtensionRow[]> {
    return listExtensions(DEFAULT_USER);
  }

  async enableExtension(name: string): Promise<void> {
    const row = await db.select().from(extensions).where(eq(extensions.id, name)).limit(1);
    if (row.length === 0) {
      throw new NotFoundError(`Extension "${name}"`);
    }
    await toggleExtension(DEFAULT_USER, name, true);
  }

  async disableExtension(name: string): Promise<void> {
    const row = await db.select().from(extensions).where(eq(extensions.id, name)).limit(1);
    if (row.length === 0) {
      throw new NotFoundError(`Extension "${name}"`);
    }
    await toggleExtension(DEFAULT_USER, name, false);
  }

  async installExtension(url: string): Promise<ExtensionRow> {
    return installExtension(DEFAULT_USER, { url, scope: 'user' });
  }

  async uninstallExtension(name: string): Promise<void> {
    return uninstallExtension(DEFAULT_USER, name);
  }

  async updateExtension(name: string): Promise<ExtensionRow> {
    return updateExtension(DEFAULT_USER, name);
  }

  async updateAllExtensions(): Promise<ExtensionRow[]> {
    const result = await updateAllExtensions(DEFAULT_USER);
    const all = [...result.updated];
    const rows: ExtensionRow[] = [];
    for (const id of all) {
      const row = await getExtension(DEFAULT_USER, id);
      if (row) rows.push(row);
    }
    return rows;
  }
}

export const extensionsService = new ExtensionsService();

export async function seedPreinstalledGlobalExtensions(): Promise<void> {
  const root = getGlobalExtensionRoot();
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return;
  }

  const subdirs = entries.filter((e) => e.isDirectory() && /^[a-z0-9-]+$/.test(e.name));
  for (const dir of subdirs) {
    const extId = dir.name;
    const manifestPath = path.join(root, extId, 'manifest.json');
    let manifestObj: unknown;
    try {
      const text = await Bun.file(manifestPath).text();
      manifestObj = JSON.parse(text);
    } catch {
      // No manifest or unreadable — skip silently (empty/orphan dirs are common)
      continue;
    }

    let parsed: Manifest;
    try {
      parsed = validateManifest(manifestObj);
    } catch (err) {
      log.warn(
        'ext',
        `Preinstalled seed: skipping "${extId}" (invalid manifest):`,
        err instanceof Error ? err.message : err,
      );
      continue;
    }

    if (parsed.id !== extId) {
      log.warn(
        'ext',
        `Preinstalled seed: skipping "${extId}" (manifest.id "${parsed.id}" does not match folder name)`,
      );
      continue;
    }

    const timestamp = new Date().toISOString();
    const existing = await db
      .select()
      .from(extensions)
      .where(and(eq(extensions.id, extId), eq(extensions.scope, 'global')))
      .limit(1);

    if (existing.length > 0) {
      const existingRow = existing[0]!;
      await db
        .update(extensions)
        .set({
          displayName: parsed.displayName,
          version: parsed.version,
          author: parsed.author,
          description: parsed.description,
          manifestCache: parsed,
          lastUpdatedAt: timestamp,
        })
        .where(and(eq(extensions.id, extId), eq(extensions.scope, 'global')));
      continue;
    }

    await db.insert(extensions).values({
      id: parsed.id,
      name: parsed.id,
      displayName: parsed.displayName,
      version: parsed.version,
      author: parsed.author,
      description: parsed.description,
      gitUrl: null,
      branch: null,
      scope: 'global',
      enabled: parsed.enabledByDefault,
      settings: {},
      manifestCache: parsed,
      installedAt: timestamp,
      lastUpdatedAt: timestamp,
      userId: DEFAULT_USER,
    });
  }
}

function parseGitHubUrl(gitUrl: string): { owner: string; repo: string } | null {
  const https = gitUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (https) return { owner: https[1]!, repo: https[2]! };
  const ssh = gitUrl.match(/github\.com:([^/]+)\/([^/.]+)/);
  if (ssh) return { owner: ssh[1]!, repo: ssh[2]! };
  return null;
}

export async function checkForUpdates(): Promise<void> {
  const rows = await db
    .select()
    .from(extensions)
    .where(isNotNull(extensions.gitUrl));

  if (rows.length === 0) return;
  log.info('ext', `Checking ${rows.length} extensions for updates...`);

  let updated = 0;
  for (const row of rows) {
    if (!row.gitUrl) continue;
    try {
      const gh = parseGitHubUrl(row.gitUrl);
      let remoteManifest: Manifest | null = null;

      if (gh) {
        const branch = row.branch || 'main';
        const manifestPath = row.subfolder ? `${row.subfolder}/manifest.json` : 'manifest.json';
        const url = `https://raw.githubusercontent.com/${gh.owner}/${gh.repo}/${branch}/${manifestPath}`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'SlopForge/1.0' },
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const text = await res.text();
          try {
            remoteManifest = validateManifest(JSON.parse(text));
          } catch {}
        }
      }

      if (!remoteManifest) {
        const tempDest = mkdtempSync(path.join(tmpdir(), 'wc-ext-check-'));
        try {
          const branch = row.branch || await getDefaultBranch(
            path.join(DATA_ROOT, row.scope === 'global' ? 'extensions' : `${row.userId}/extensions`, row.id),
          );
          await cloneRepo(row.gitUrl, tempDest, { branch, timeoutMs: 15000 });
          const extRoot = row.subfolder ? path.join(tempDest, row.subfolder) : tempDest;
          const manifestText = await Bun.file(path.join(extRoot, 'manifest.json')).text();
          remoteManifest = validateManifest(JSON.parse(manifestText));
        } catch {}
        try { await rmrf(tempDest); } catch {}
      }

      if (remoteManifest && remoteManifest.version !== row.version) {
        await db
          .update(extensions)
          .set({ hasUpdate: true })
          .where(eq(extensions.id, row.id));
        updated++;
      } else {
        await db
          .update(extensions)
          .set({ hasUpdate: false })
          .where(eq(extensions.id, row.id));
      }
    } catch (err) {
      log.warn('ext', `Update check failed for "${row.id}":`, err instanceof Error ? err.message : err);
    }
  }

  if (updated > 0) {
    log.info('ext', `${updated} extension(s) have updates available`);
  }
}
