import { describe, expect, test } from "bun:test"
import { signSession, verifySession, getSession, type SessionPayload } from "../session"

describe("session", () => {
  test("sign and verify round-trips", () => {
    const payload: SessionPayload = {
      userId: "test-user",
      csrfToken: "abc123",
    }
    const signed = signSession(payload)
    const verified = verifySession(signed)
    expect(verified).toEqual(payload)
  })

  test("tampered signature returns null", () => {
    const payload: SessionPayload = {
      userId: "test-user",
      csrfToken: "abc123",
    }
    const signed = signSession(payload)
    const tampered = signed.slice(0, -1) + "0"
    const verified = verifySession(tampered)
    expect(verified).toBeNull()
  })

  test("tampered body returns null", () => {
    const payload: SessionPayload = {
      userId: "test-user",
      csrfToken: "abc123",
    }
    const signed = signSession(payload)
    const [body, sig] = signed.split(".")
    const tampered = body + "x." + sig
    const verified = verifySession(tampered)
    expect(verified).toBeNull()
  })

  test("parse cookie header with multiple cookies", () => {
    const payload: SessionPayload = {
      userId: "test-user",
      csrfToken: "abc123",
    }
    const signed = signSession(payload)
    const cookieHeader = `other=value; slopforge-session=${signed}; another=cookie`
    const req = new Request("http://localhost/", {
      headers: { Cookie: cookieHeader },
    })
    const session = getSession(req)
    expect(session).toEqual(payload)
  })
})
