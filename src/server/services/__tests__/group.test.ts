import { describe, it, expect } from "bun:test"
import { groupService } from "@/server/services/group.service"

describe("GroupService", () => {
  const testGroupName = "Test Group"
  let groupId: string

  it("create returns group with id and name", async () => {
    const group = await groupService.create({
      name: testGroupName,
      members: ["char1.png", "char2.png"],
      allow_self_responses: false,
      activation_strategy: 0,
      generation_mode: 0,
      disabled_members: [],
    })
    groupId = group.id
    expect(group.id).toBeDefined()
    expect(group.name).toBe(testGroupName)
    expect(group.members).toEqual(["char1.png", "char2.png"])
    expect(group.fav).toBe(false)
    expect(group.chats).toEqual([])
  })

  it("get returns the created group", async () => {
    const group = await groupService.get(groupId)
    expect(group).not.toBeNull()
    expect(group!.name).toBe(testGroupName)
    expect(group!.members).toContain("char1.png")
  })

  it("get returns null for non-existent group", async () => {
    const group = await groupService.get("non-existent-id")
    expect(group).toBeNull()
  })

  it("addMember adds a member", async () => {
    await groupService.addMember(groupId, "char3.png")
    const group = await groupService.get(groupId)
    expect(group!.members).toContain("char3.png")
  })

  it("addMember throws on duplicate member", async () => {
    await expect(groupService.addMember(groupId, "char3.png")).rejects.toThrow()
  })

  it("removeMember removes a member", async () => {
    await groupService.removeMember(groupId, "char3.png")
    const group = await groupService.get(groupId)
    expect(group!.members).not.toContain("char3.png")
  })

  it("removeMember throws for non-member", async () => {
    await expect(groupService.removeMember(groupId, "char3.png")).rejects.toThrow()
  })

  it("getAll returns the group in the list", async () => {
    const all = await groupService.getAll()
    const found = all.find((g) => g.id === groupId)
    expect(found).toBeDefined()
    expect(found!.name).toBe(testGroupName)
  })

  it("update modifies group fields", async () => {
    await groupService.update(groupId, { name: "Updated Name", fav: true })
    const group = await groupService.get(groupId)
    expect(group!.name).toBe("Updated Name")
    expect(group!.fav).toBe(true)
  })

  it("delete removes the group", async () => {
    await groupService.delete(groupId)
    const group = await groupService.get(groupId)
    expect(group).toBeNull()
  })

  it("delete throws for non-existent group", async () => {
    await expect(groupService.delete(groupId)).rejects.toThrow()
  })
})
