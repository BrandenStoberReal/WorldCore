import { watch, type FSWatcher, type Dirent, type Stats } from 'node:fs';
import { stat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { DATA_ROOT } from '@/server/storage/paths';
import { readCharacterCard } from '@/server/storage/png-metadata';
import { normalizeToV3 } from '@/server/importers/character.importer';
import { characterService } from '@/server/services/character.service';
import { db } from '@/server/db/client';
import { characters } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

const DEBOUNCE_MS = 500;
const DEFAULT_USER = 'default-user';

// Store `started` on globalThis so it survives `bun --hot` module re-evaluation.
const g = globalThis as Record<string, unknown>;
if (!g.__character_watcher_started) g.__character_watcher_started = false;
let started: boolean = g.__character_watcher_started as boolean;

let watcher: FSWatcher | null = null;
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const inFlight = new Set<string>();
let consecutiveErrors = 0;

/**
 * Derive the userId from an absolute path by locating the `characters` segment
 * and taking the segment immediately before it. Falls back to DEFAULT_USER
 * (with a warning) when the layout is unexpected.
 */
function deriveUserId(absPath: string): string {
  const parts = absPath.split(path.sep);
  const charsIdx = parts.lastIndexOf('characters');
  if (charsIdx > 0) {
    const userId = parts[charsIdx - 1];
    if (userId && userId.length > 0) return userId;
  }
  console.warn(
    `[character-watcher] could not derive userId from path, falling back to "${DEFAULT_USER}": ${absPath}`,
  );
  return DEFAULT_USER;
}

/**
 * Per-file import pipeline. Used for both the initial scan and live fs.watch
 * events. Never throws — errors are logged and swallowed so a single bad file
 * cannot kill the watcher.
 */
async function processFile(absPath: string): Promise<void> {
  // (a) stat — skip transient files that have already vanished.
  let stats: Stats;
  try {
    stats = await stat(absPath);
  } catch {
    // File no longer exists on disk — a third-party tool removed it. If a DB
    // row still owns this filename, clean up the character row + chat file +
    // chat rows via the canonical delete path.
    await handleDeletion(absPath);
    return;
  }
  if (!stats.isFile()) return;

  // (b) read the raw PNG buffer.
  let pngBuffer: Buffer;
  try {
    pngBuffer = await readFile(absPath);
  } catch (err) {
    console.error(`[character-watcher] failed to read file ${absPath}:`, err);
    return;
  }

  // (c) read embedded character card JSON. Skip plain PNGs.
  let jsonStr: string | undefined;
  try {
    jsonStr = await readCharacterCard(absPath);
  } catch (err) {
    console.error(`[character-watcher] failed to read card metadata ${absPath}:`, err);
    return;
  }
  if (!jsonStr) {
    console.warn(`[character-watcher] no character data embedded, skipping: ${absPath}`);
    return;
  }

  // (d) parse the embedded JSON.
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  } catch (err) {
    console.error(`[character-watcher] failed to parse card JSON ${absPath}:`, err);
    return;
  }

  // (e) normalize to v3 canonical shape.
  const normalized = normalizeToV3(parsed);

  // (f) derive the normalized target filename — mirrors character.service.ts:531.
  const name = String(normalized.name ?? 'Unknown');
  const targetFileName = `${name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;

  // (g) derive userId from the path layout.
  const userId = deriveUserId(absPath);

  // (h) dedup gate — skip silently if already imported.
  const existing = await characterService.getByFileName(targetFileName, userId);
  if (existing) return;

  // (i) import — fresh PNG write + DB insert.
  const id = await characterService.importCharacter(pngBuffer, JSON.stringify(normalized), userId);
  console.log(`[character-watcher] imported "${name}" (user=${userId}) -> id=${id}`);
}

/**
 * Cleanup pass for the deletion branch: a PNG that previously existed has been
 * removed from the user's characters/ directory (via `rm`, OS file explorer,
 * etc.). If a DB row still owns the removed file, delete the character row +
 * the chat file + the chat rows via the canonical `characterService.delete`
 * path (so the cleanup matches in-app deletion). Never throws.
 */
async function handleDeletion(absPath: string): Promise<void> {
  const fileName = path.basename(absPath);
  const userId = deriveUserId(absPath);
  let deleted = false;
  try {
    deleted = await characterService.deleteByFileNameIfExists(fileName, userId);
  } catch (err) {
    console.error(`[character-watcher] failed to clean up deleted file ${absPath}:`, err);
    return;
  }
  if (deleted) {
    console.log(`[character-watcher] cleaned up DB row for removed file "${fileName}" (user=${userId})`);
  }
  // If `deleted` is false, the file had no DB row (plain PNG ante-import temp,
  // or an orphan the user just removed via the Settings panel). Silent skip.
}

/**
 * Schedule a debounced processing pass for a single path. Coalesces the
 * multi-event writes common on Windows NTFS into a single import attempt.
 */
function scheduleProcessing(absPath: string): void {
  // Single-flight: if a previous invocation is still mid-processing, let the
  // debounce timer reschedule rather than stacking another in-flight entry.
  if (inFlight.has(absPath)) return;

  const existing = debounceTimers.get(absPath);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    debounceTimers.delete(absPath);
    if (inFlight.has(absPath)) return; // still processing from a prior fire.
    inFlight.add(absPath);
    void processFile(absPath)
      .catch((err) => {
        console.error(`[character-watcher] failed to import ${absPath}:`, err);
      })
      .finally(() => {
        inFlight.delete(absPath);
      });
  }, DEBOUNCE_MS);
  debounceTimers.set(absPath, timer);
}

/**
 * Walk DATA_ROOT one level deep for user dirs, then one level deeper for
 * `characters/*.png`. Returns absolute paths only.
 */
async function discoverCharacterPngs(): Promise<string[]> {
  const results: string[] = [];
  let userDirs: Dirent[];
  try {
    userDirs = await readdir(DATA_ROOT, { withFileTypes: true });
  } catch (err) {
    console.error('[character-watcher] failed to read DATA_ROOT for initial scan:', err);
    return results;
  }

  for (const entry of userDirs) {
    if (!entry.isDirectory()) continue;
    // Skip internal/cache dirs (leading underscore).
    if (entry.name.startsWith('_')) continue;
    const charsDir = path.join(DATA_ROOT, entry.name, 'characters');
    let charEntries: Dirent[];
    try {
      charEntries = await readdir(charsDir, { withFileTypes: true });
    } catch {
      continue; // no characters dir for this user — fine.
    }
    for (const f of charEntries) {
      if (!f.isFile()) continue;
      if (!f.name.toLowerCase().endsWith('.png')) continue;
      if (f.name.toLowerCase().startsWith('thumb_')) continue;
      results.push(path.resolve(charsDir, f.name));
    }
  }
  return results;
}

/**
 * Walk each user's `characters/` directory and check whether every DB row's
 * `fileName` still exists on disk. If a PNG is missing, the row is a
 * "reverse orphan" — clean it up via the canonical delete path. Catches
 * deletions that happened while the server was down. Never throws per-user.
 */
async function cleanupReverseOrphans(): Promise<void> {
  let userDirs: Dirent[];
  try {
    userDirs = await readdir(DATA_ROOT, { withFileTypes: true });
  } catch (err) {
    console.error('[character-watcher] reverse-orphans: failed to read DATA_ROOT:', err);
    return;
  }

  for (const entry of userDirs) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('_')) continue;
    const userId = entry.name;
    const charsDir = path.join(DATA_ROOT, userId, 'characters');

    let rows: { fileName: string }[];
    try {
      rows = await db
        .select({ fileName: characters.fileName })
        .from(characters)
        .where(eq(characters.userId, userId));
    } catch (err) {
      console.error(`[character-watcher] reverse-orphans: failed to query rows for ${userId}:`, err);
      continue;
    }

    for (const row of rows) {
      const pngPath = path.join(charsDir, row.fileName);
      try {
        await stat(pngPath); // exists → keep.
      } catch {
        // Missing on disk → reverse orphan. Clean up via canonical path.
        try {
          const deleted = await characterService.deleteByFileNameIfExists(row.fileName, userId);
          if (deleted) {
            console.log(`[character-watcher] cleaned up DB row for missing file "${row.fileName}" (user=${userId})`);
          }
        } catch (err) {
          console.error(`[character-watcher] reverse-orphans: failed to clean up ${row.fileName} for ${userId}:`, err);
        }
      }
    }
  }
}

/**
 * Initial scan: import any PNGs already on disk that aren't yet in the DB
 * (e.g. the user dropped them while the server was down). Runs BEFORE the
 * fs.watch handle is armed so we don't double-process files that appear
 * between scan and watch.
 */
async function runInitialScan(): Promise<void> {
  const files = await discoverCharacterPngs();
  if (files.length > 0) {
    console.log(`[character-watcher] initial scan: ${files.length} PNG(s) on disk`);
    for (const absPath of files) {
      inFlight.add(absPath);
      try {
        await processFile(absPath);
      } catch (err) {
        console.error(`[character-watcher] failed to import ${absPath}:`, err);
      } finally {
        inFlight.delete(absPath);
      }
    }
  }

  // Reverse-orphans pass: clean up DB rows whose PNG was removed while the
  // server was down. Runs after the import pass so we don't trip over an
  // in-flight import.
  await cleanupReverseOrphans();
}

function armWatcher(): void {
  if (watcher) {
    try {
      watcher.close();
    } catch {
      // ignore — best-effort cleanup.
    }
    watcher = null;
  }

  const w = watch(DATA_ROOT, { recursive: true, persistent: true }, (eventType, filename) => {
    if (!filename) return;
    // Only act on PNG events (case-insensitive).
    if (!filename.toLowerCase().endsWith('.png')) return;
    // Skip thumbnails — these are generated by the app and not character cards.
    // Processing them would cause infinite loops (import writes thumb → watcher
    // re-imports thumb → writes another thumb → ...) and false positives when
    // source images carry leftover chara/ccv3 metadata chunks.
    const baseName = path.basename(filename).toLowerCase();
    if (baseName.startsWith('thumb_')) return;
    const absPath = path.resolve(DATA_ROOT, filename);
    // Only act when the path contains a `characters` directory segment.
    if (!absPath.split(path.sep).includes('characters')) return;
    scheduleProcessing(absPath);
  });

  w.on('error', (err) => {
    console.error('[character-watcher] fs.watch error:', err);
    consecutiveErrors += 1;
    if (consecutiveErrors >= 2) {
      console.error(
        '[character-watcher] giving up after repeated fs.watch errors; live watching disabled',
      );
      try {
        w.close();
      } catch {
        // ignore.
      }
      watcher = null;
      return;
    }
    // Re-arm once.
    try {
      w.close();
    } catch {
      // ignore.
    }
    watcher = null;
    armWatcher();
  });

  // Reset the error counter on a successful arm — a fresh watch with no
  // immediate error means the underlying handle is healthy again.
  w.once('change', () => {
    consecutiveErrors = 0;
  });

  watcher = w;
}

/**
 * Start the character folder watcher. Idempotent — a second call is a no-op
 * (the only defense we have against `bun --hot` restarts).
 */
export function startCharacterWatcher(): void {
  if (process.env.NODE_ENV === 'test') return;
  if (started) return;
  started = true;
  g.__character_watcher_started = true;
  consecutiveErrors = 0;

  // Kick off the initial scan, then arm the live watcher. The scan runs
  // before arming so we don't double-process files that appear between the
  // scan and the watch handle.
  void runInitialScan()
    .then(() => {
      armWatcher();
      console.log(`[character-watcher] watching ${DATA_ROOT} for new character PNGs`);
    })
    .catch((err) => {
      console.error('[character-watcher] initial scan failed:', err);
      // Still try to arm the live watcher — existing files will be picked up
      // by future writes, which is a degraded but functional mode.
      armWatcher();
    });
}

/**
 * Stop the watcher and release all resources. Safe to call even if never
 * started. Resolves once the FSWatcher has been closed.
 */
export function stopCharacterWatcher(): Promise<void> {
  console.log('[character-watcher] shutting down...');
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer);
  }
  debounceTimers.clear();
  inFlight.clear();

  const w = watcher;
  watcher = null;
  started = false;
  g.__character_watcher_started = false;
  consecutiveErrors = 0;

  if (!w) return Promise.resolve();
  return new Promise<void>((resolve) => {
    try {
      w.close();
    } catch (err) {
      console.error('[character-watcher] error closing watcher:', err);
    }
    resolve();
  });
}
