import { describe, it, expect } from "bun:test"
import { secretManager } from "@/server/services/secrets.service"
import type { SecretKey } from "@/shared/types/secret"

const testKey: SecretKey = "openai_key"
const testExportKey: SecretKey = "libre_url"

describe("SecretManager", () => {
  it("write and read back", async () => {
    await secretManager.write(testKey, "sk-test123")
    const result = await secretManager.read(testKey)
    expect(result).not.toBeNull()
    expect(result!.value).toBe("sk-test123")
  })

  it("overwrite deactivates previous", async () => {
    await secretManager.write(testKey, "new-value")
    const result = await secretManager.read(testKey)
    expect(result).not.toBeNull()
    expect(result!.value).toBe("new-value")
  })

  it("view returns masked value for non-exportable key", async () => {
    await secretManager.write(testKey, "sk-masked123")
    const result = await secretManager.view(testKey)
    expect(result).not.toBeNull()
    expect(result!.value).not.toBe("sk-masked123")
    expect(result!.value).toContain("\u2022")
  })

  it("view returns plain value for exportable key", async () => {
    await secretManager.write(testExportKey, "http://example.com")
    const result = await secretManager.view(testExportKey)
    expect(result).not.toBeNull()
    expect(result!.value).toBe("http://example.com")
  })

  it("delete removes entry", async () => {
    await secretManager.write(testKey, "to-delete")
    const ok = await secretManager.delete(testKey)
    expect(ok).toBe(true)
    const result = await secretManager.read(testKey)
    expect(result).toBeNull()
  })

  it("rotate replaces value", async () => {
    await secretManager.write(testKey, "original")
    const rotated = await secretManager.rotate(testKey, "rotated-value")
    expect(rotated.value).toBe("rotated-value")
    const result = await secretManager.read(testKey)
    expect(result!.value).toBe("rotated-value")
  })

  it("rename updates label", async () => {
    await secretManager.write(testKey, "val", "original-label")
    const ok = await secretManager.rename(testKey, "new-label")
    expect(ok).toBe(true)
    const result = await secretManager.read(testKey)
    expect(result!.label).toBe("new-label")
  })

  it("findAll returns all keys", async () => {
    await secretManager.write(testKey, "test")
    const all = await secretManager.findAll()
    expect(all[testKey]).not.toBeNull()
  })
})
