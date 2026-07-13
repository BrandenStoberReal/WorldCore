import { describe, it, expect } from "bun:test"
import { characterService } from "@/server/services/character.service"
import type { CharacterCreateInput } from "@/shared/types/character"

const baseInput = (name: string): CharacterCreateInput => ({
  name,
  description: "",
  personality: "",
  scenario: "",
  first_mes: "",
  mes_example: "",
  creator_notes: "",
  system_prompt: "",
  post_history_instructions: "",
  tags: [],
  creator: "",
  character_version: "",
  alternate_greetings: [],
})

describe("CharacterService", () => {
  it("create a character and get it back by ID", async () => {
    const created = await characterService.create(baseInput("TestChar_Svc"))

    expect(created.name).toBe("TestChar_Svc")
    expect(created.id).toBeGreaterThan(0)

    const fetched = await characterService.get(created.id)
    expect(fetched).not.toBeNull()
    expect(fetched!.name).toBe("TestChar_Svc")
  })

  it("rename updates name", async () => {
    const created = await characterService.create(baseInput("RenameMe_Svc"))

    await characterService.rename(created.id, "RenamedChar_Svc")
    const fetched = await characterService.get(created.id)
    expect(fetched).not.toBeNull()
    expect(fetched!.name).toBe("RenamedChar_Svc")
  })

  it("edit updates fields", async () => {
    const created = await characterService.create({ ...baseInput("EditMe_Svc"), description: "Original" })

    await characterService.edit(created.id, { description: "Updated description" })
    const fetched = await characterService.get(created.id)
    expect(fetched).not.toBeNull()
    expect(fetched!.description).toBe("Updated description")
  })

  it("delete removes character", async () => {
    const created = await characterService.create(baseInput("DeleteMe_Svc"))

    await characterService.delete(created.id)
    const fetched = await characterService.get(created.id)
    expect(fetched).toBeNull()
  })

  it("getAll returns list containing character", async () => {
    await characterService.create(baseInput("ListMe_Svc"))

    const all = await characterService.getAll()
    const found = (all as Array<{ name: string }>).find((c) => c.name === "ListMe_Svc")
    expect(found).not.toBeNull()
  })

  it("duplicate creates new character with same data", async () => {
    const created = await characterService.create({
      ...baseInput("DupSource_Svc"),
      description: "To duplicate",
      personality: "Nice",
    })

    const newId = await characterService.duplicate(created.id)
    expect(newId).not.toBe(created.id)

    const dup = await characterService.get(newId)
    expect(dup).not.toBeNull()
    expect(dup!.name).toBe("DupSource_Svc (copy)")
    expect(dup!.description).toBe("To duplicate")
    expect(dup!.personality).toBe("Nice")
  })
})
