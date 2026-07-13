import { describe, expect, it } from "bun:test"
import { db } from "../client"
import { characters, chats, worldinfoFiles, worldinfoEntries } from "../schema"
import { eq } from "drizzle-orm"

describe("BUG-7: FK cascade rules", () => {
  it("deleting a character cascades to its chats", async () => {
    const now = Date.now()

    // Insert character
    const [character] = await db
      .insert(characters)
      .values({
        name: "Cascade Test Char",
        avatar: "test_avatar",
        fileName: "cascade_test.png",
        jsonData: '{"name":"Cascade Test"}',
        spec: "chara_card_v2",
        specVersion: "2.0",
        tags: [],
        createDate: new Date().toISOString(),
        dateAdded: now,
      })
      .returning()

    expect(character).toBeDefined()

    // Insert chat referencing that character
    const [chat] = await db
      .insert(chats)
      .values({
        fileId: `cascade-chat-${now}`,
        fileName: "cascade_chat.jsonl",
        characterId: character!.id,
      })
      .returning()

    expect(chat).toBeDefined()

    // Verify chat exists
    const foundChat = await db.select().from(chats).where(eq(chats.id, chat!.id))
    expect(foundChat).toHaveLength(1)

    // Delete the character — should cascade to chats
    await db.delete(characters).where(eq(characters.id, character!.id))

    // Verify chat was cascade-deleted
    const orphanedChat = await db.select().from(chats).where(eq(chats.id, chat!.id))
    expect(orphanedChat).toHaveLength(0)
  })

  it("deleting a worldinfo file cascades to its entries", async () => {
    const now = Date.now()

    // Insert worldinfo file
    const [wiFile] = await db
      .insert(worldinfoFiles)
      .values({
        fileName: `cascade_wi_${now}.json`,
        name: "Cascade Test WI",
      })
      .returning()

    expect(wiFile).toBeDefined()

    // Insert worldinfo entry referencing that file
    const [entry] = await db
      .insert(worldinfoEntries)
      .values({
        fileId: wiFile!.id,
        uid: `entry-${now}`,
        keys: ["test_key"],
        content: "test content",
      })
      .returning()

    expect(entry).toBeDefined()

    // Verify entry exists
    const foundEntry = await db.select().from(worldinfoEntries).where(eq(worldinfoEntries.id, entry!.id))
    expect(foundEntry).toHaveLength(1)

    // Delete the worldinfo file — should cascade to entries
    await db.delete(worldinfoFiles).where(eq(worldinfoFiles.id, wiFile!.id))

    // Verify entry was cascade-deleted
    const orphanedEntry = await db.select().from(worldinfoEntries).where(eq(worldinfoEntries.id, entry!.id))
    expect(orphanedEntry).toHaveLength(0)
  })
})
