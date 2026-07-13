import { describe, expect, it } from "bun:test"
import { db } from "../client"
import type { Database } from "bun:sqlite"

describe("BUG-5: PRAGMA busy_timeout", () => {
  it("busy_timeout is set to 5000ms", () => {
    const client = (db as { $client: Database }).$client
    const row = client.query("PRAGMA busy_timeout").get() as { timeout: number }
    expect(row.timeout).toBe(5000)
  })
})
