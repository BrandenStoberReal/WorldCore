import { describe, expect, test } from "bun:test"
import { verifyCsrfToken, generateCsrfToken } from "../csrf"

describe("csrf", () => {
  test("generate and verify correct token", () => {
    const token = generateCsrfToken()
    const req = new Request("http://localhost/", {
      method: "POST",
      headers: { "X-CSRF-Token": token },
    })
    expect(verifyCsrfToken(req, token)).toBe(true)
  })

  test("verify wrong token returns false", () => {
    const token = generateCsrfToken()
    const req = new Request("http://localhost/", {
      method: "POST",
      headers: { "X-CSRF-Token": "wrong-token" },
    })
    expect(verifyCsrfToken(req, token)).toBe(false)
  })

  test("GET request skips verification", () => {
    const req = new Request("http://localhost/", { method: "GET" })
    expect(verifyCsrfToken(req, "some-token")).toBe(true)
  })

  test("missing token on POST returns false", () => {
    const req = new Request("http://localhost/", { method: "POST" })
    expect(verifyCsrfToken(req, "some-token")).toBe(false)
  })
})
