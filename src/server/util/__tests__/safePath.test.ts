import { describe, expect, it } from "bun:test"
import { safePathWithin } from "../safePath"

describe("safePathWithin", () => {
  it("returns resolved path for simple file", () => {
    expect(safePathWithin("/app/data", "file.txt")).toBe("/app/data/file.txt")
  })

  it("returns null for directory traversal", () => {
    expect(safePathWithin("/app/data", "../etc/passwd")).toBeNull()
  })

  it("returns null for nested traversal", () => {
    expect(safePathWithin("/app/data", "subdir/../../etc/passwd")).toBeNull()
  })

  it("returns resolved path for nested file", () => {
    expect(safePathWithin("/app/data", "subdir/file.txt")).toBe("/app/data/subdir/file.txt")
  })

  it("returns base dir for empty string", () => {
    expect(safePathWithin("/app/data", "")).toBe("/app/data")
  })

  it("returns null for absolute path", () => {
    expect(safePathWithin("/app/data", "/absolute/path")).toBeNull()
  })

  it("handles long relative path", () => {
    const longPath = "a".repeat(200)
    expect(safePathWithin("/app/data", longPath)).toBe(`/app/data/${longPath}`)
  })
})
