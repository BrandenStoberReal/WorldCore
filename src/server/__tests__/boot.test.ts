import { describe, it, expect } from "bun:test"
import { csrfRoutes } from "@/server/routes/csrf.routes"

describe("CSRF route", () => {
  it("returns a token", async () => {
    const req = new Request("http://localhost/api/v1/csrf-token")
    const res = await csrfRoutes.GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.token).toBeDefined()
    expect(typeof data.token).toBe("string")
    expect(res.headers.get("Set-Cookie")).toBeDefined()
  })
})

describe("Route registry", () => {
  it("builds routes", async () => {
    const { buildApiRoutes, listRoutes } = await import("@/server/routes")
    const routes = buildApiRoutes()
    const paths = listRoutes()
    expect(paths).toContain("/api/v1/csrf-token")
    expect(routes["/api/v1/csrf-token"]).toBeDefined()
  })
})
