import { describe, it, expect, afterEach } from "bun:test"
import { detectImportFormat, normalizeToV3, importFromJson, importFromYaml } from "../character.importer"
import fs from "node:fs/promises"
import path from "node:path"
import { characterService } from "@/server/services/character.service"

const testDir = path.join("./data", "_test_importer")
const createdIds: number[] = []

describe("detectImportFormat", () => {
  it("detects PNG formats", () => {
    expect(detectImportFormat("char.png")).toBe("png")
    expect(detectImportFormat("char.jpg")).toBe("png")
    expect(detectImportFormat("char.jpeg")).toBe("png")
    expect(detectImportFormat("char.webp")).toBe("png")
  })

  it("detects JSON format", () => {
    expect(detectImportFormat("char.json")).toBe("json")
  })

  it("detects YAML formats", () => {
    expect(detectImportFormat("char.yaml")).toBe("yaml")
    expect(detectImportFormat("char.yml")).toBe("yaml")
  })

  it("detects CharX from filename", () => {
    expect(detectImportFormat("MyCharX.zip")).toBe("charx")
    expect(detectImportFormat("charx_file.zip")).toBe("charx")
  })

  it("detects BYAF from filename", () => {
    expect(detectImportFormat("MyBYAF.zip")).toBe("byaf")
    expect(detectImportFormat("byaf_archive.zip")).toBe("byaf")
  })

  it("defaults unknown ZIP to charx", () => {
    expect(detectImportFormat("unknown.zip")).toBe("charx")
  })

  it("defaults unknown extension to json", () => {
    expect(detectImportFormat("char.txt")).toBe("json")
    expect(detectImportFormat("char")).toBe("json")
  })
})

describe("normalizeToV3", () => {
  it("wraps V1 flat data with spec", () => {
    const input = {
      name: "TestChar",
      description: "A test",
      personality: "Friendly",
      first_mes: "Hi!",
      greeting: "Hello!",
    }
    const result = normalizeToV3(input)

    expect(result.spec).toBe("chara_card_v2")
    expect(result.name).toBe("TestChar")
    expect(result.description).toBe("A test")
    expect(result.first_mes).toBe("Hi!")
    expect(result.tags).toEqual([])
    expect(result.extensions).toHaveProperty("talkativeness", 0.5)
    expect(result.extensions).toHaveProperty("fav", false)
  })

  it("preserves V2/V3 spec", () => {
    const input = {
      spec: "chara_card_v3",
      spec_version: "3.0",
      name: "V3Char",
      description: "V3 description",
      extensions: { talkativeness: 0.8, custom_field: "preserved" },
    }
    const result = normalizeToV3(input)

    expect(result.spec).toBe("chara_card_v3")
    expect(result.name).toBe("V3Char")
    const ext = result.extensions as Record<string, unknown>
    expect(ext.talkativeness).toBe(0.8)
    expect(ext.custom_field).toBe("preserved")
  })

  it("preserves unknown extension fields", () => {
    const input = {
      name: "ExtChar",
      extensions: {
        talkativeness: 0.6,
        fav: true,
        custom_ext_1: "value1",
        custom_ext_2: { nested: true },
      },
    }
    const result = normalizeToV3(input)
    const ext = result.extensions as Record<string, unknown>

    expect(ext.custom_ext_1).toBe("value1")
    expect(ext.custom_ext_2).toEqual({ nested: true })
  })

  it("does not mutate input object", () => {
    const input = {
      name: "Immutable",
      description: "Original",
      extensions: { talkativeness: 0.5, custom: "data" },
    }
    const inputCopy = JSON.parse(JSON.stringify(input))

    normalizeToV3(input)

    expect(input).toEqual(inputCopy)
  })

  it("adds default extensions when missing", () => {
    const input = {
      spec: "chara_card_v3",
      spec_version: "3.0",
      name: "NoExt",
    }
    const result = normalizeToV3(input)
    const ext = result.extensions as Record<string, unknown>

    expect(ext.talkativeness).toBe(0.5)
    expect(ext.fav).toBe(false)
    expect(ext.world).toBe("")
    expect(ext.depth_prompt).toEqual({ prompt: "", depth: 4, role: "system" })
  })

  it("strips fav to false on V1 import", () => {
    const input = {
      name: "StripFav",
      personality: "Test",
    }
    const result = normalizeToV3(input)
    const ext = result.extensions as Record<string, unknown>
    expect(ext.fav).toBe(false)
  })
})

describe("importFromJson", () => {
  it("imports character from JSON file", async () => {
    await fs.mkdir(testDir, { recursive: true })
    const charData = {
      spec: "chara_card_v3",
      spec_version: "3.0",
      name: "JsonImportTest",
      description: "Imported from JSON",
      personality: "Curious",
      scenario: "",
      first_mes: "Hello from JSON!",
      mes_example: "",
      creator_notes: "",
      system_prompt: "",
      post_history_instructions: "",
      tags: ["json", "test"],
      creator: "",
      character_version: "",
      alternate_greetings: [],
      extensions: {
        talkativeness: 0.7,
        fav: false,
        world: "",
        custom_json_field: "should_persist",
      },
    }
    const filePath = path.join(testDir, "test_import.json")
    await fs.writeFile(filePath, JSON.stringify(charData))

    const id = await importFromJson(filePath)
    createdIds.push(id)
    expect(id).toBeGreaterThan(0)

    const char = await characterService.get(id)
    expect(char).not.toBeNull()
    expect(char!.name).toBe("JsonImportTest")
    expect(char!.description).toBe("Imported from JSON")
    expect(char!.tags).toEqual(["json", "test"])
  })
})

describe("importFromYaml", () => {
  it("imports character from YAML file", async () => {
    await fs.mkdir(testDir, { recursive: true })
    const yamlContent = `name: YamlImportTest
context: |
  This character was imported from YAML format.
personality: Witty and charming
scenario: A coffee shop
greeting: Hey there! Want a coffee?
tags:
  - yaml
  - test
`
    const filePath = path.join(testDir, "test_import.yaml")
    await fs.writeFile(filePath, yamlContent)

    const id = await importFromYaml(filePath)
    createdIds.push(id)
    expect(id).toBeGreaterThan(0)

    const char = await characterService.get(id)
    expect(char).not.toBeNull()
    expect(char!.name).toBe("YamlImportTest")
    expect(char!.description).toContain("YAML format")
    expect(char!.first_mes).toContain("coffee")
    expect(char!.tags).toEqual(["yaml", "test"])
  })
})

afterEach(async () => {
  for (const id of createdIds) {
    try {
      await characterService.delete(id)
    } catch {
      // Already deleted
    }
  }
  createdIds.length = 0
  try {
    await fs.rm(testDir, { recursive: true, force: true })
  } catch {
    // Directory may not exist
  }
})
