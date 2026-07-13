import { describe, it, expect } from "bun:test"
import { settingsService } from "@/server/services/settings.service"

describe("SettingsService", () => {
  it("save and get round trip", async () => {
    await settingsService.save({ theme: "dark", lang: "en" })
    const result = await settingsService.get()
    expect(result.theme).toBe("dark")
    expect(result.lang).toBe("en")
  })

  it("make snapshot and list", async () => {
    await settingsService.save({ theme: "dark" })
    const id = await settingsService.makeSnapshot("test-snapshot")
    expect(id).toBeDefined()

    const snapshots = await settingsService.getSnapshots()
    expect(snapshots.length).toBeGreaterThan(0)
    const found = snapshots.find((s) => s.id === id)
    expect(found).toBeDefined()
    expect(found!.name).toBe("test-snapshot")
  })

  it("restore snapshot", async () => {
    await settingsService.save({ theme: "dark", lang: "en" })
    const id = await settingsService.makeSnapshot("restore-test")
    await settingsService.save({ theme: "light", lang: "fr" })

    await settingsService.restoreSnapshot(id)
    const result = await settingsService.get()
    expect(result.theme).toBe("dark")
    expect(result.lang).toBe("en")
  })

  it("load snapshot returns data", async () => {
    await settingsService.save({ theme: "ocean" })
    const id = await settingsService.makeSnapshot("load-test")
    const data = await settingsService.loadSnapshot(id)
    expect(data.theme).toBe("ocean")
  })
})
