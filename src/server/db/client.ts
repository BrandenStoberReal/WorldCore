import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from './schema';
import { loadAppConfig } from '../config';
import { createJsonDb } from './json-adapter';

const GLOBAL_DB_KEY = '__WorldCore_db__' as const;

export function createDb(path: string = ':memory:') {
  const sqlite = new Database(path);
  sqlite.exec('PRAGMA journal_mode = WAL;');
  sqlite.exec('PRAGMA foreign_keys = ON;');
  sqlite.exec('PRAGMA busy_timeout = 5000;');
  return drizzle(sqlite, { schema });
}

function createDbForBackend() {
  const cfg = loadAppConfig();
  if (!cfg) return createDb('./data/WorldCore.sqlite');

  switch (cfg.backend) {
    case 'sqlite':
      return createDb('./data/WorldCore.sqlite');
    case 'mongodb':
      throw new Error(
        'MongoDB backend must be initialized asynchronously via createMongoDb() in app.ts.',
      );
    case 'jsonfiles':
      return createJsonDb() as unknown as ReturnType<typeof createDb>;
    default:
      return createDb('./data/WorldCore.sqlite');
  }
}

const g = globalThis as Record<string, unknown>;
const testDb = g[GLOBAL_DB_KEY] as ReturnType<typeof createDb> | undefined;
export const db = testDb ?? createDbForBackend();

export { schema };
