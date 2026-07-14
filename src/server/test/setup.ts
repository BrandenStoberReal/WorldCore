import { drizzle } from "drizzle-orm/bun-sqlite"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import { Database } from "bun:sqlite"
import { resolve } from "node:path"
import * as schema from "@/server/db/schema"

const sqlite = new Database(":memory:")
sqlite.exec("PRAGMA journal_mode = WAL;")
sqlite.exec("PRAGMA foreign_keys = ON;")
sqlite.exec("PRAGMA busy_timeout = 5000;")

const testDb = drizzle(sqlite, { schema })

migrate(testDb, {
  migrationsFolder: resolve(import.meta.dir, "../db/migrations"),
})

;(globalThis as Record<string, unknown>).__WorldCore_db__ = testDb
