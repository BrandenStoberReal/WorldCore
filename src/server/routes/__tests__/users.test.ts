import { describe, it, expect } from "bun:test"
import { usersPublicRoutes } from "@/server/routes/users.public.routes"
import { usersPrivateRoutes } from "@/server/routes/users.private.routes"
import { usersAdminRoutes } from "@/server/routes/users.admin.routes"

describe("Users public routes", () => {
  it("list returns default-user", async () => {
    const res = await usersPublicRoutes.list(
      new Request("http://localhost/api/v1/users/list", { method: "POST" }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as unknown[]
    expect(data).toContain("default-user")
  })

  it("login accepts password", async () => {
    const res = await usersPublicRoutes.login(
      new Request("http://localhost/api/v1/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: "default-user", password: "test123" }),
      }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as Record<string, unknown>
    expect(data.handle).toBe("default-user")
    expect(res.headers.get("Set-Cookie")).toBeDefined()
  })

  it("logout clears session", async () => {
    const res = await usersPublicRoutes.logout(
      new Request("http://localhost/api/v1/users/logout", { method: "POST" }),
    )
    expect(res.status).toBe(200)
    const cookie = res.headers.get("Set-Cookie")
    expect(cookie).toContain("Max-Age=0")
  })
})

describe("Users private routes", () => {
  it("me returns user info", async () => {
    const res = await usersPrivateRoutes.me(
      new Request("http://localhost/api/v1/users/me"),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as Record<string, unknown>
    expect(data.handle).toBe("default-user")
    expect(data.admin).toBe(true)
  })

  it("change-password accepts new password", async () => {
    const res = await usersPrivateRoutes.changePassword(
      new Request("http://localhost/api/v1/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: "newpass123" }),
      }),
    )
    expect(res.status).toBe(200)
  })
})

describe("Users admin routes", () => {
  it("get returns default user", async () => {
    const res = await usersAdminRoutes.get(
      new Request("http://localhost/api/v1/admin/users/get", { method: "POST" }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as unknown[]
    expect(Array.isArray(data)).toBe(true)
  })

  it("slugify produces slug", async () => {
    const res = await usersAdminRoutes.slugify(
      new Request("http://localhost/api/v1/admin/users/slugify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "John Doe" }),
      }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as Record<string, string>
    expect(data.slug).toBe("john-doe")
  })
})
