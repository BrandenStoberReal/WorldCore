import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { db } from './client';
import type { createDb } from './client';
import { resolve } from 'node:path';

type DrizzleDb = ReturnType<typeof createDb>;

const MIGRATIONS_FOLDER = resolve(import.meta.dir, './migrations');

const SEED_SQL = [
  `CREATE TABLE IF NOT EXISTS connection_profiles (
    id text PRIMARY KEY NOT NULL,
    user_id text NOT NULL,
    name text NOT NULL,
    data text NOT NULL,
    created_at integer NOT NULL,
    updated_at integer NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
  )`,
  `ALTER TABLE presets ADD COLUMN is_default integer NOT NULL DEFAULT 0`,
];

export function runMigrations(dbInstance?: DrizzleDb) {
  const instance = dbInstance ?? db;
  migrate(instance, { migrationsFolder: MIGRATIONS_FOLDER });
  for (const sql of SEED_SQL) {
    try {
      instance.$client.exec(sql);
    } catch {
      // table already exists — ignore
    }
  }
}
