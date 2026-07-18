import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { Database } from 'bun:sqlite';
import { resolve } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as schema from '@/server/db/schema';

// Create temp directory for test data BEFORE any module imports
// This prevents polluting the real data directory
const testDataDir = mkdtempSync(resolve(tmpdir(), 'worldcore-test-'));
process.env.WORLDCORE_DATA_ROOT = testDataDir;

const sqlite = new Database(':memory:');
sqlite.exec('PRAGMA journal_mode = WAL;');
sqlite.exec('PRAGMA foreign_keys = ON;');
sqlite.exec('PRAGMA busy_timeout = 5000;');

const testDb = drizzle(sqlite, { schema });

migrate(testDb, {
  migrationsFolder: resolve(import.meta.dir, '../db/migrations'),
});

(globalThis as Record<string, unknown>).__WorldCore_db__ = testDb;

// Cleanup temp data dir on process exit
process.on('exit', () => {
  try {
    rmSync(testDataDir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
});
