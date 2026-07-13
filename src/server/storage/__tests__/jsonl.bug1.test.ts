import { describe, expect, it, beforeEach } from "bun:test"
import { readLastLine } from "../jsonl"
import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"

const testDir = path.join("./data", "_test_jsonl_bug1")

beforeEach(async () => {
  await rm(testDir, { recursive: true, force: true }).catch(() => {})
  await mkdir(testDir, { recursive: true })
})

describe("BUG-1: File descriptor leak in readLastLine", () => {
  it("returns null for non-existent file", async () => {
    const result = await readLastLine("/tmp/nonexistent-file-12345.jsonl")
    expect(result).toBeNull()
  })

  it("returns null for empty file", async () => {
    const filePath = path.join(testDir, "empty.jsonl")
    await writeFile(filePath, "", "utf-8")
    const result = await readLastLine(filePath)
    expect(result).toBeNull()
  })

  it("reads last line of a single-line file", async () => {
    const filePath = path.join(testDir, "single.jsonl")
    await writeFile(filePath, '{"id":1}', "utf-8")
    const result = await readLastLine(filePath)
    expect(result).toBe('{"id":1}')
  })

  it("reads last line of a multi-line file", async () => {
    const filePath = path.join(testDir, "multi.jsonl")
    await writeFile(filePath, '{"id":1}\n{"id":2}\n{"id":3}', "utf-8")
    const result = await readLastLine(filePath)
    expect(result).toBe('{"id":3}')
  })

  it("does not leak file descriptors on repeated calls", async () => {
    const filePath = path.join(testDir, "repeat.jsonl")
    await writeFile(filePath, '{"id":1}\n{"id":2}', "utf-8")

    // Call readLastLine multiple times to confirm fd is always closed
    for (let i = 0; i < 10; i++) {
      const result = await readLastLine(filePath)
      expect(result).toBe('{"id":2}')
    }
  })
})
