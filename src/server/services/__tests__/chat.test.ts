import { describe, it, expect } from "bun:test"
import { chatService } from "@/server/services/chat.service"

describe("ChatService", () => {
  it("create a chat and get messages (empty)", async () => {
    const fileId = await chatService.save("TestCharacter", "User")
    expect(fileId).toBeDefined()
    const messages = await chatService.getMessages(fileId)
    expect(messages).toEqual([])
    await chatService.delete(fileId)
  })

  it("append a message and get messages", async () => {
    const fileId = await chatService.save("TestCharacter", "User")
    await chatService.appendMessage(fileId, {
      name: "User",
      is_user: true,
      mes: "Hello!",
      extra: {},
    })
    const messages = await chatService.getMessages(fileId)
    expect(messages.length).toBe(1)
    expect(messages[0]!.mes).toBe("Hello!")
    await chatService.delete(fileId)
  })

  it("edit a message", async () => {
    const fileId = await chatService.save("TestCharacter", "User")
    await chatService.appendMessage(fileId, {
      name: "User",
      is_user: true,
      mes: "Original",
      extra: {},
    })
    await chatService.editMessage(fileId, 0, { mes: "Edited" })
    const messages = await chatService.getMessages(fileId)
    expect(messages[0]!.mes).toBe("Edited")
    await chatService.delete(fileId)
  })

  it("delete a message", async () => {
    const fileId = await chatService.save("TestCharacter", "User")
    await chatService.appendMessage(fileId, {
      name: "User",
      is_user: true,
      mes: "To delete",
      extra: {},
    })
    await chatService.deleteMessage(fileId, 0)
    const messages = await chatService.getMessages(fileId)
    expect(messages.length).toBe(0)
    await chatService.delete(fileId)
  })

  it("export JSONL contains metadata and messages", async () => {
    const fileId = await chatService.save("TestCharacter", "User")
    await chatService.appendMessage(fileId, {
      name: "User",
      is_user: true,
      mes: "Export test",
      extra: {},
    })
    const { data } = await chatService.exportJsonl(fileId)
    const content = data.toString("utf-8")
    const lines = content.split("\n").filter((l) => l.trim())
    expect(lines.length).toBe(2)
    const metadata = JSON.parse(lines[0]!)
    expect(metadata.character_name).toBe("TestCharacter")
    await chatService.delete(fileId)
  })

  it("search finds message containing text", async () => {
    const fileId = await chatService.save("SearchChar", "User")
    await chatService.appendMessage(fileId, {
      name: "User",
      is_user: true,
      mes: "This is a searchable message",
      extra: {},
    })
    const results = await chatService.search("searchable")
    expect(results.length).toBeGreaterThanOrEqual(1)
    const found = results.find((r) => r.file_id === fileId)
    expect(found).toBeDefined()
    expect(found!.match).toContain("searchable")
    await chatService.delete(fileId)
  })

  it("rename updates character name in metadata", async () => {
    const fileId = await chatService.save("OldName", "User")
    await chatService.rename(fileId, "NewName")
    const metadata = await chatService.getMetadata(fileId)
    expect(metadata).not.toBeNull()
    expect(metadata!.character_name).toBe("NewName")
    await chatService.delete(fileId)
  })

  it("getRecent returns chats sorted by recency", async () => {
    const f1 = await chatService.save("Char1", "User")
    const f2 = await chatService.save("Char2", "User")
    const recent = await chatService.getRecent(10)
    expect(recent.length).toBeGreaterThanOrEqual(2)
    const ids = recent.map((r) => r.file_id)
    expect(ids).toContain(f1)
    expect(ids).toContain(f2)
    await chatService.delete(f1)
    await chatService.delete(f2)
  })

  it("listAll returns all chats", async () => {
    const f1 = await chatService.save("ListChar1", "User")
    const f2 = await chatService.save("ListChar2", "User")
    const all = await chatService.listAll()
    const ids = all.map((c) => c.file_id)
    expect(ids).toContain(f1)
    expect(ids).toContain(f2)
    await chatService.delete(f1)
    await chatService.delete(f2)
  })

  it("exportText returns readable text", async () => {
    const fileId = await chatService.save("TextChar", "User")
    await chatService.appendMessage(fileId, {
      name: "Alice",
      is_user: false,
      mes: "Hello from Alice",
      extra: {},
    })
    const { data, fileName } = await chatService.exportText(fileId)
    expect(fileName.endsWith(".txt")).toBe(true)
    expect(data.toString("utf-8")).toContain("Alice: Hello from Alice")
    await chatService.delete(fileId)
  })
})
