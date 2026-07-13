import { db } from "@/server/db/client"
import { characters, chats } from "@/server/db/schema"
import { eq, asc } from "drizzle-orm"
import { paths } from "@/server/storage/paths"
import { writeFile, readFile, removeFile, copyFile } from "@/server/storage/fs"
import { writeCharacterCard } from "@/server/storage/png-metadata"
import path from "node:path"
import fs from "node:fs/promises"
import { SHARED_CONST } from "@/shared/constants"
import type { Character, ShallowCharacter, CharacterCreateInput, CharacterData } from "@/shared/types/character"
import { NotFoundError } from "@/server/errors"
import * as yaml from "yaml"
import { Jimp } from "jimp"

const DEFAULT_SPEC = "chara_card_v3"
const DEFAULT_SPEC_VERSION = "3.0"

async function generatePlaceholderPng(): Promise<Buffer> {
  const img = new Jimp({ width: SHARED_CONST.AVATAR_WIDTH, height: SHARED_CONST.AVATAR_HEIGHT, color: 0x000000ff })
  return img.getBuffer("image/png")
}

function normalizeToV3(data: CharacterCreateInput): CharacterData {
  return {
    name: data.name,
    description: data.description ?? "",
    personality: data.personality ?? "",
    scenario: data.scenario ?? "",
    first_mes: data.first_mes ?? "",
    mes_example: data.mes_example ?? "",
    creator_notes: data.creator_notes ?? "",
    system_prompt: data.system_prompt ?? "",
    post_history_instructions: data.post_history_instructions ?? "",
    tags: data.tags ?? [],
    creator: data.creator ?? "",
    character_version: data.character_version ?? "",
    alternate_greetings: data.alternate_greetings ?? [],
    character_book: data.character_book,
    extensions: data.extensions,
  }
}

export type CharacterWithId = { id: number } & Character

function buildCharacter(
  id: number,
  data: CharacterData,
  avatar: string,
  fileName: string,
  spec: string,
  specVersion: string,
  createDate: string,
  dateAdded: number,
  dataSize: number,
): CharacterWithId {
  return {
    id,
    ...data,
    avatar,
    chat: fileName.replace(".png", ".json"),
    create_date: createDate,
    date_added: new Date(dateAdded).toISOString(),
    date_last_chat: undefined,
    chat_size: 0,
    data_size: dataSize,
    json_data: { spec, spec_version: specVersion },
  }
}

function buildShallowCharacter(
  id: number,
  data: CharacterData,
  avatar: string,
  fileName: string,
  createDate: string,
  dateAdded: number,
  dataSize: number,
): ShallowCharacter {
  return {
    id,
    shallow: true,
    avatar,
    chat: fileName.replace(".png", ".json"),
    create_date: createDate,
    date_added: new Date(dateAdded).toISOString(),
    date_last_chat: undefined,
    chat_size: 0,
    data_size: dataSize,
    name: data.name,
    description: data.description,
    tags: data.tags,
  }
}

export class CharacterService {
  async create(input: CharacterCreateInput): Promise<CharacterWithId> {
    const data = normalizeToV3(input)
    const spec = input.spec ?? DEFAULT_SPEC
    const specVersion = input.spec_version ?? DEFAULT_SPEC_VERSION
    const fileName = `${data.name.replace(/[^a-zA-Z0-9]/g, "_")}.png`
    const filePath = path.join(paths.characters, fileName)

    let pngBuffer: Buffer
    if (input.avatar && input.avatar.startsWith("data:image/")) {
      const base64Data = input.avatar.split(",")[1]
      pngBuffer = Buffer.from(base64Data!, "base64")
    } else {
      pngBuffer = await generatePlaceholderPng()
    }
    const jsonData = JSON.stringify({ spec, spec_version: specVersion, ...data })
    await writeCharacterCard(pngBuffer, jsonData, filePath)

    const now = Date.now()
    const createDate = new Date(now).toISOString()
    const dataSize = Buffer.from(jsonData).length

    const result = await db
      .insert(characters)
      .values({
        name: data.name,
        avatar: fileName,
        fileName,
        jsonData,
        spec,
        specVersion,
        tags: data.tags,
        creator: data.creator,
        characterVersion: data.character_version,
        createDate,
        dateAdded: now,
        dateLastChat: 0,
        chatSize: 0,
        dataSize,
        fav: false,
        userId: "default-user",
      })
      .returning()

    const row = result[0]!
    return buildCharacter(Number(row.id), data, fileName, fileName, spec, specVersion, createDate, now, dataSize)
  }

  async rename(id: number, newName: string): Promise<void> {
    const row = await db.select().from(characters).where(eq(characters.id, id)).limit(1)
    if (row.length === 0) {
      throw new NotFoundError(`Character with id ${id}`)
    }
    const charRow = row[0]!
    const parsedData = JSON.parse(charRow.jsonData) as CharacterData
    parsedData.name = newName

    const newFileName = `${newName.replace(/[^a-zA-Z0-9]/g, "_")}.png`
    const oldFilePath = path.join(paths.characters, charRow.avatar)
    const newFilePath = path.join(paths.characters, newFileName)

    const jsonData = JSON.stringify(parsedData)
    await writeCharacterCard(oldFilePath, jsonData, newFilePath)
    await removeFile(oldFilePath)

    await db.update(characters)
      .set({
        name: newName,
        avatar: newFileName,
        fileName: newFileName,
        jsonData,
      })
      .where(eq(characters.id, id))
  }

  async edit(id: number, data: Partial<CharacterData>): Promise<void> {
    const row = await db.select().from(characters).where(eq(characters.id, id)).limit(1)
    if (row.length === 0) {
      throw new NotFoundError(`Character with id ${id}`)
    }
    const charRow = row[0]!
    const parsedData = JSON.parse(charRow.jsonData) as CharacterData
    const merged = { ...parsedData, ...data } as CharacterData

    const filePath = path.join(paths.characters, charRow.avatar)
    const jsonData = JSON.stringify(merged)
    await writeCharacterCard(filePath, jsonData, filePath)

    await db.update(characters)
      .set({
        name: merged.name,
        jsonData,
        tags: merged.tags,
        creator: merged.creator,
        characterVersion: merged.character_version,
        dataSize: Buffer.from(jsonData).length,
      })
      .where(eq(characters.id, id))
  }

  async editAvatar(id: number, avatarData: string | Buffer): Promise<void> {
    const row = await db.select().from(characters).where(eq(characters.id, id)).limit(1)
    if (row.length === 0) {
      throw new NotFoundError(`Character with id ${id}`)
    }
    const charRow = row[0]!
    const filePath = path.join(paths.characters, charRow.avatar)

    const pngBuffer = typeof avatarData === "string" ? await fs.readFile(avatarData) : avatarData
    await writeCharacterCard(pngBuffer, charRow.jsonData, filePath)
  }

  async editAttribute(
    id: number,
    field: string,
    value: string | string[] | boolean | number,
  ): Promise<void> {
    const row = await db.select().from(characters).where(eq(characters.id, id)).limit(1)
    if (row.length === 0) {
      throw new NotFoundError(`Character with id ${id}`)
    }
    const charRow = row[0]!
    const parsedData = JSON.parse(charRow.jsonData) as Record<string, unknown> & CharacterData
    parsedData[field as keyof CharacterData] = value as never

    const filePath = path.join(paths.characters, charRow.avatar)
    const jsonData = JSON.stringify(parsedData)
    await writeCharacterCard(filePath, jsonData, filePath)

    const updateData: Record<string, unknown> = { jsonData }
    if (field === "name") updateData.name = value
    if (field === "tags") updateData.tags = value as string[]
    if (field === "creator") updateData.creator = value as string
    if (field === "character_version") updateData.characterVersion = value as string
    updateData.dataSize = Buffer.from(jsonData).length

    await db.update(characters)
      .set(updateData)
      .where(eq(characters.id, id))
  }

  async mergeAttributes(id: number, attrs: Record<string, unknown>): Promise<void> {
    const row = await db.select().from(characters).where(eq(characters.id, id)).limit(1)
    if (row.length === 0) {
      throw new NotFoundError(`Character with id ${id}`)
    }
    const charRow = row[0]!
    const parsedData = JSON.parse(charRow.jsonData) as Record<string, unknown> & CharacterData
    const merged = { ...parsedData, ...attrs } as CharacterData

    const filePath = path.join(paths.characters, charRow.avatar)
    const jsonData = JSON.stringify(merged)
    await writeCharacterCard(filePath, jsonData, filePath)

    const updateData: Record<string, unknown> = { jsonData }
    if ("name" in attrs) updateData.name = attrs.name
    if ("tags" in attrs) updateData.tags = attrs.tags as string[]
    if ("creator" in attrs) updateData.creator = attrs.creator as string
    if ("character_version" in attrs) updateData.characterVersion = attrs.character_version as string
    updateData.dataSize = Buffer.from(jsonData).length

    await db.update(characters)
      .set(updateData)
      .where(eq(characters.id, id))
  }

  async delete(id: number): Promise<void> {
    const row = await db.select().from(characters).where(eq(characters.id, id)).limit(1)
    if (row.length === 0) {
      throw new NotFoundError(`Character with id ${id}`)
    }
    const charRow = row[0]!

    const pngPath = path.join(paths.characters, charRow.avatar)
    await removeFile(pngPath)

    const chatFileName = charRow.fileName.replace(".png", ".json")
    const chatPath = path.join(paths.chats, chatFileName)
    await removeFile(chatPath)

    await db.delete(chats).where(eq(chats.characterId, id))
    await db.delete(characters).where(eq(characters.id, id))
  }

  async getAll(shallow?: boolean): Promise<CharacterWithId[] | ShallowCharacter[]> {
    const rows = await db.select().from(characters).orderBy(asc(characters.name))

    if (shallow) {
      return rows.map((row) => {
        const data = JSON.parse(row.jsonData) as CharacterData
        return buildShallowCharacter(Number(row.id), data, row.avatar, row.fileName, row.createDate, row.dateAdded, row.dataSize)
      })
    }

    return rows.map((row) => {
      const data = JSON.parse(row.jsonData) as CharacterData
      return buildCharacter(Number(row.id), data, row.avatar, row.fileName, row.spec, row.specVersion, row.createDate, row.dateAdded, row.dataSize)
    })
  }

  async get(id: number): Promise<CharacterWithId | null> {
    const rows = await db.select().from(characters).where(eq(characters.id, id)).limit(1)
    if (rows.length === 0) return null
    const row = rows[0]!
    const data = JSON.parse(row.jsonData) as CharacterData
    return buildCharacter(Number(row.id), data, row.avatar, row.fileName, row.spec, row.specVersion, row.createDate, row.dateAdded, row.dataSize)
  }

  async getByFileName(fileName: string): Promise<CharacterWithId | null> {
    const rows = await db.select().from(characters).where(eq(characters.fileName, fileName)).limit(1)
    if (rows.length === 0) return null
    const row = rows[0]!
    const data = JSON.parse(row.jsonData) as CharacterData
    return buildCharacter(Number(row.id), data, row.avatar, row.fileName, row.spec, row.specVersion, row.createDate, row.dateAdded, row.dataSize)
  }

  async getChats(fileName: string): Promise<Array<{ fileId: string; fileName: string }>> {
    const charRows = await db.select().from(characters).where(eq(characters.fileName, fileName)).limit(1)
    if (charRows.length === 0) return []
    const charId = Number(charRows[0]!.id)

    const chatRows = await db.select({ fileId: chats.fileId, fileName: chats.fileName }).from(chats).where(eq(chats.characterId, charId))
    return chatRows
  }

  async duplicate(id: number): Promise<number> {
    const row = await db.select().from(characters).where(eq(characters.id, id)).limit(1)
    if (row.length === 0) {
      throw new NotFoundError(`Character with id ${id}`)
    }
    const sourceRow = row[0]!
    const sourceData = JSON.parse(sourceRow.jsonData) as CharacterData

    const dupName = `${sourceData.name} (copy)`
    const dupFileName = `${dupName.replace(/[^a-zA-Z0-9]/g, "_")}.png`
    const sourceFilePath = path.join(paths.characters, sourceRow.avatar)
    const dupFilePath = path.join(paths.characters, dupFileName)

    const dupData = JSON.parse(JSON.stringify(sourceData)) as CharacterData
    dupData.name = dupName
    const dupJsonData = JSON.stringify(dupData)

    await copyFile(sourceFilePath, dupFilePath)
    await writeCharacterCard(dupFilePath, dupJsonData, dupFilePath)

    const now = Date.now()
    const createDate = new Date(now).toISOString()

    const result = await db
      .insert(characters)
      .values({
        name: dupName,
        avatar: dupFileName,
        fileName: dupFileName,
        jsonData: dupJsonData,
        spec: sourceRow.spec,
        specVersion: sourceRow.specVersion,
        tags: dupData.tags,
        creator: dupData.creator,
        characterVersion: dupData.character_version,
        createDate,
        dateAdded: now,
        dateLastChat: 0,
        chatSize: 0,
        dataSize: Buffer.from(dupJsonData).length,
        fav: false,
        userId: "default-user",
      })
      .returning()

    return Number(result[0]!.id)
  }

  async importCharacter(pngData: Buffer, jsonData: string): Promise<number> {
    const parsed = JSON.parse(jsonData) as CharacterData & { spec?: string; spec_version?: string }
    const spec = parsed.spec ?? DEFAULT_SPEC
    const specVersion = parsed.spec_version ?? DEFAULT_SPEC_VERSION

    const fileName = `${parsed.name.replace(/[^a-zA-Z0-9]/g, "_")}.png`
    const destPath = path.join(paths.characters, fileName)

    await writeCharacterCard(pngData, jsonData, destPath)

    const now = Date.now()
    const createDate = new Date(now).toISOString()

    const result = await db
      .insert(characters)
      .values({
        name: parsed.name,
        avatar: fileName,
        fileName,
        jsonData,
        spec,
        specVersion,
        tags: parsed.tags ?? [],
        creator: parsed.creator ?? "",
        characterVersion: parsed.character_version ?? "",
        createDate,
        dateAdded: now,
        dateLastChat: 0,
        chatSize: 0,
        dataSize: Buffer.from(jsonData).length,
        fav: false,
        userId: "default-user",
      })
      .returning()

    return Number(result[0]!.id)
  }

  async exportCharacter(
    id: number,
    format: "png" | "json" | "yaml",
  ): Promise<{ data: Buffer; mimeType: string; fileName: string }> {
    const row = await db.select().from(characters).where(eq(characters.id, id)).limit(1)
    if (row.length === 0) {
      throw new NotFoundError(`Character with id ${id}`)
    }
    const charRow = row[0]!

    if (format === "png") {
      const pngPath = path.join(paths.characters, charRow.avatar)
      const pngData = await readFile(pngPath)
      return {
        data: pngData,
        mimeType: "image/png",
        fileName: charRow.fileName,
      }
    }

    const jsonData = charRow.jsonData
    if (format === "json") {
      return {
        data: Buffer.from(jsonData),
        mimeType: "application/json",
        fileName: charRow.fileName.replace(".png", ".json"),
      }
    }

    const parsed = JSON.parse(jsonData) as Record<string, unknown>
    const yamlStr = yaml.stringify(parsed)
    return {
      data: Buffer.from(yamlStr),
      mimeType: "text/yaml",
      fileName: charRow.fileName.replace(".png", ".yaml"),
    }
  }
}

export const characterService = new CharacterService()
