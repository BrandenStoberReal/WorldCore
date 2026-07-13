import { describe, it, expect } from "bun:test"
import { db } from "../client"
import { characters, groups, presets } from "../schema"
import { eq } from "drizzle-orm"

describe("schema round-trip", () => {
  it("insert and query a character", async () => {
    const now = Date.now()
    const result = await db
      .insert(characters)
      .values({
        name: "Test Character",
        avatar: "test_avatar",
        fileName: "test.png",
        jsonData: '{"name":"Test"}',
        spec: "chara_card_v2",
        specVersion: "2.0",
        tags: ["tag1", "tag2"],
        createDate: new Date().toISOString(),
        dateAdded: now,
      })
      .returning()

    expect(result).toHaveLength(1)
    const inserted = result[0]!
    expect(inserted.name).toBe("Test Character")
    expect(inserted.spec).toBe("chara_card_v2")
    expect(inserted.tags).toEqual(["tag1", "tag2"])

    const queried = await db.select().from(characters).where(eq(characters.id, inserted.id))
    expect(queried).toHaveLength(1)
    expect(queried[0]!.name).toBe("Test Character")
    expect(queried[0]!.tags).toEqual(["tag1", "tag2"])

    await db.delete(characters).where(eq(characters.id, inserted.id))
  })

  it("insert and query a group", async () => {
    const now = Date.now()
    const result = await db
      .insert(groups)
      .values({
        id: "test-group-" + now,
        name: "Test Group",
        members: ["char1", "char2"],
        dateAdded: now,
        createDate: new Date().toISOString(),
      })
      .returning()

    expect(result).toHaveLength(1)
    const inserted = result[0]!
    expect(inserted.name).toBe("Test Group")
    expect(inserted.members).toEqual(["char1", "char2"])
    expect(inserted.allowSelfResponses).toBe(false)
    expect(inserted.autoModeDelay).toBe(5)

    await db.delete(groups).where(eq(groups.id, inserted.id))
  })

  it("insert and query a preset", async () => {
    const result = await db
      .insert(presets)
      .values({
        name: "Test Preset",
        category: "openai",
        data: { temperature: 0.7, max_tokens: 200 },
      })
      .returning()

    expect(result).toHaveLength(1)
    const inserted = result[0]!
    expect(inserted.name).toBe("Test Preset")
    expect(inserted.category).toBe("openai")
    expect(inserted.data).toEqual({ temperature: 0.7, max_tokens: 200 })

    await db.delete(presets).where(eq(presets.id, inserted.id))
  })
})
