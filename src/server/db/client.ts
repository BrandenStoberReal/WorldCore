import { drizzle } from "drizzle-orm/bun-sqlite"
import { Database } from "bun:sqlite"
import * as schema from "./schema"

const GLOBAL_DB_KEY = "__slopforge_db__" as const

export function createDb(path: string = ":memory:") {
  const sqlite = new Database(path)
  sqlite.exec("PRAGMA journal_mode = WAL;")
  sqlite.exec("PRAGMA foreign_keys = ON;")
  sqlite.exec("PRAGMA busy_timeout = 5000;")
  return drizzle(sqlite, { schema })
}

// Check for a test override set by the preload script.
// In production the global is absent, so we create the real file-backed DB.
const g = globalThis as Record<string, unknown>
export const db =
  (g[GLOBAL_DB_KEY] as ReturnType<typeof createDb>) ??
  createDb("./data/slopforge.sqlite")

export { schema }
