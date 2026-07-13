import { describe, it, expect } from "bun:test"
import { presetService } from "@/server/services/preset.service"
import type { Preset } from "@/shared/types/preset"

const testPreset: Preset = {
  category: "sysprompt",
  data: { name: "test-preset-t14", content: "You are a helpful assistant." },
} as Preset

describe("PresetService", () => {
  it("save and get back", async () => {
    await presetService.save(testPreset)
    const result = await presetService.get("sysprompt", "test-preset-t14")
    expect(result).not.toBeNull()
    expect(result!.category).toBe("sysprompt")
    expect((result!.data as Record<string, unknown>).content).toBe(
      "You are a helpful assistant.",
    )
  })

  it("getByCategory includes saved preset", async () => {
    const presets = await presetService.getByCategory("sysprompt")
    const found = presets.find(
      (p) => (p.data as Record<string, unknown>).name === "test-preset-t14",
    )
    expect(found).not.toBeNull()
    expect(found!.category).toBe("sysprompt")
  })

  it("getAll includes preset from category", async () => {
    const all = await presetService.getAll()
    const found = all.find(
      (p) =>
        p.category === "sysprompt" &&
        (p.data as Record<string, unknown>).name === "test-preset-t14",
    )
    expect(found).not.toBeNull()
  })

  it("getAll with category filter", async () => {
    const all = await presetService.getAll("sysprompt")
    expect(all.length).toBeGreaterThanOrEqual(1)
    const found = all.find(
      (p) => (p.data as Record<string, unknown>).name === "test-preset-t14",
    )
    expect(found).not.toBeNull()
  })

  it("export returns buffer and filename", async () => {
    const result = await presetService.exportPreset(
      "sysprompt",
      "test-preset-t14",
    )
    expect(result).not.toBeNull()
    expect(result!.fileName).toBe("test-preset-t14.json")
    expect(result!.data).toBeInstanceOf(Buffer)
    const exported = JSON.parse(result!.data.toString()) as Record<string, unknown>
    expect(exported.content).toBe("You are a helpful assistant.")
  })

  it("delete removes preset", async () => {
    await presetService.delete("sysprompt", "test-preset-t14")
    const result = await presetService.get("sysprompt", "test-preset-t14")
    expect(result).toBeNull()
  })

  it("get non-existent preset returns null", async () => {
    const result = await presetService.get("sysprompt", "does-not-exist-t14")
    expect(result).toBeNull()
  })
})
