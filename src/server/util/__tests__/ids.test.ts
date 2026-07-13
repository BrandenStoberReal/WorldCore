import { describe, expect, it } from "bun:test"
import { assertValidFileId } from "../ids"
import { ValidationError } from "@/server/errors"

describe("assertValidFileId", () => {
  it("accepts valid UUID", () => {
    expect(() => assertValidFileId("550e8400-e29b-41d4-a716-446655440000")).not.toThrow()
  })
  it("rejects path traversal", () => {
    expect(() => assertValidFileId("../../etc/passwd")).toThrow(ValidationError)
  })
  it("rejects empty string", () => {
    expect(() => assertValidFileId("")).toThrow(ValidationError)
  })
  it("rejects non-UUID format", () => {
    expect(() => assertValidFileId("not-a-uuid")).toThrow(ValidationError)
  })
})
