import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import { db } from "./client"
import type { createDb } from "./client"
import { resolve } from "node:path"

type DrizzleDb = ReturnType<typeof createDb>

const MIGRATIONS_FOLDER = resolve(import.meta.dir, "./migrations")

export function runMigrations(dbInstance?: DrizzleDb) {
  migrate(dbInstance ?? db, { migrationsFolder: MIGRATIONS_FOLDER })
}
