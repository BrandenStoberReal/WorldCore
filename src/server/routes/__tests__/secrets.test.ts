import { describe, it, expect } from "bun:test"
import { secretsRoutes } from "@/server/routes/secrets.routes"
import type { SecretKey } from "@/shared/types/secret"

const testKey = "openai_key" as SecretKey
const testExportKey = "libre_url" as SecretKey

describe("Secrets routes", () => {
  it("write returns ok and id", async () => {
    const res = await secretsRoutes.write(
      new Request("http://localhost/api/v1/secrets/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: testKey, value: "sk-route-test" }),
      }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as Record<string, unknown>
    expect(data.ok).toBe(true)
    expect(data.id).toBe(testKey)
  })

  it("view returns masked data", async () => {
    const res = await secretsRoutes.view(
      new Request("http://localhost/api/v1/secrets/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: testKey }),
      }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as Record<string, unknown> | null
    expect(data).not.toBeNull()
    expect(typeof data!.value).toBe("string")
    expect((data!.value as string).includes("\u2022")).toBe(true)
  })

  it("view exportable key returns plain value", async () => {
    await secretsRoutes.write(
      new Request("http://localhost/api/v1/secrets/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: testExportKey,
          value: "http://exportable.test",
        }),
      }),
    )

    const res = await secretsRoutes.view(
      new Request("http://localhost/api/v1/secrets/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: testExportKey }),
      }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as Record<string, unknown> | null
    expect(data).not.toBeNull()
    expect(data!.value).toBe("http://exportable.test")
  })

  it("delete returns ok", async () => {
    const res = await secretsRoutes.delete(
      new Request("http://localhost/api/v1/secrets/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: testKey }),
      }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as Record<string, unknown>
    expect(data.ok).toBe(true)
  })
})
