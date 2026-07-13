import { describe, expect, test } from "bun:test"
import { hashPassword, verifyPassword } from "../password"

describe("password", () => {
  test("hash and verify correct password", async () => {
    const plain = "my-secret-password"
    const hashed = await hashPassword(plain)
    const result = await verifyPassword(plain, hashed)
    expect(result).toBe(true)
  })

  test("verify wrong password returns false", async () => {
    const plain = "my-secret-password"
    const hashed = await hashPassword(plain)
    const result = await verifyPassword("wrong-password", hashed)
    expect(result).toBe(false)
  })

  test("verify empty stored hash returns false", async () => {
    const result = await verifyPassword("any-password", "")
    expect(result).toBe(false)
  })
})
