import { describe, expect, it } from "bun:test"
import { ssoRoutes } from "../sso.routes"
import { signSession } from "@/server/auth/session"
import { generateCsrfToken } from "@/server/auth/session"

function makeSessionCookie(): string {
  const payload = { userId: "default-user", csrfToken: generateCsrfToken() }
  return signSession(payload)
}

describe("SEC-4: SSO settings POST requires admin", () => {
  it("GET /sso/settings works without auth", async () => {
    const req = new Request("http://localhost/api/v1/sso/settings", { method: "GET" })
    const res = await ssoRoutes.settings(req)
    expect(res.status).toBe(200)
  })

  it("POST /sso/settings returns 401 without session", async () => {
    const req = new Request("http://localhost/api/v1/sso/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    })
    const res = await ssoRoutes.settings(req)
    expect(res.status).toBe(401)
  })

  it("POST /sso/settings succeeds with admin session", async () => {
    const cookie = makeSessionCookie()
    const req = new Request("http://localhost/api/v1/sso/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `slopforge-session=${cookie}`,
      },
      body: JSON.stringify({ enabled: false }),
    })
    const res = await ssoRoutes.settings(req)
    expect(res.status).toBe(200)
  })
})
