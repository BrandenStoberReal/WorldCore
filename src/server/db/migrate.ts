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
  `CREATE TABLE IF NOT EXISTS personas (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    name text NOT NULL,
    description text DEFAULT '' NOT NULL,
    personality text DEFAULT '' NOT NULL,
    scenario text DEFAULT '' NOT NULL,
    system_prompt text DEFAULT '' NOT NULL,
    avatar text DEFAULT '' NOT NULL,
    is_default integer DEFAULT false NOT NULL,
    user_id text DEFAULT 'default-user' NOT NULL,
    date_added integer NOT NULL,
    date_modified integer NOT NULL
  )`,
  `ALTER TABLE characters ADD COLUMN bound_persona_id integer REFERENCES personas(id)`,
];

export function runMigrations(dbInstance?: DrizzleDb) {
  const instance = dbInstance ?? db;
  try {
    migrate(instance, { migrationsFolder: MIGRATIONS_FOLDER });
  } catch {
    // falls through to SEED_SQL
  }
  for (const sql of SEED_SQL) {
    try {
      instance.$client.exec(sql);
    } catch {
      // table/column already exists — ignore
    }
  }
}
