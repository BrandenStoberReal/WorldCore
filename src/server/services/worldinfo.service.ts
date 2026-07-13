import path from "node:path"
import { randomUUID } from "node:crypto"
import { db } from "@/server/db/client"
import { worldinfoFiles, worldinfoEntries } from "@/server/db/schema"
import { eq, and } from "drizzle-orm"
import { paths } from "@/server/storage/paths"
import { writeFile, readFile, removeFile, exists } from "@/server/storage/fs"
import type { WorldInfo, WorldInfoEntry } from "@/shared/types/worldinfo"
import { NotFoundError, ConflictError } from "@/server/errors"

export class WorldInfoService {
  private userId = "default-user"

  private wiFilePath(fileName: string): string {
    return path.join(paths.worlds, fileName)
  }

  private fileNameFromName(name: string): string {
    return `${name.replace(/[^a-zA-Z0-9]/g, "_")}.json`
  }

  private entryToDb(entry: WorldInfoEntry): typeof worldinfoEntries.$inferInsert {
    return {
      uid: entry.uid,
      keys: [entry.key],
      keysecondary: entry.keysecondary,
      comment: entry.comment,
      content: entry.content,
      constant: entry.constant,
      vectorized: entry.vectorized,
      selective: entry.selective,
      selectiveLogic: entry.selectiveLogic,
      addMemo: entry.addMemo,
      order: entry.order,
      position: entry.position,
      disable: entry.disable,
      excludeRecursion: entry.excludeRecursion,
      preventRecursion: entry.preventRecursion,
      delayUntilRecursion: entry.delayUntilRecursion,
      probability: entry.probability,
      useProbability: entry.useProbability,
      depth: entry.depth,
      group: String(entry.group),
      groupOverride: entry.groupOverride,
      groupWeight: entry.groupWeight,
      scanDepth: entry.scanDepth,
      caseSensitive: entry.caseSensitive,
      matchWholeWords: entry.matchWholeWords,
      automationId: entry.automationId,
      role: entry.role,
      sticky: entry.sticky ? 1 : 0,
      cooldown: entry.cooldown,
      delay: entry.delay,
      matchPersonaDescription: entry.matchPersonaDescription,
      matchCharacterDescription: entry.matchCharacterDescription,
      matchCharacterPersonality: entry.matchCharacterPersonality,
      matchCharacterDepthPrompt: entry.matchCharacterDepthPrompt,
      matchScenario: entry.matchScenario,
      matchCreatorNotes: entry.matchCreatorNotes,
      ignoreBudget: entry.ignoreBudget,
      extensions: entry.extensions ?? {},
    }
  }

  private dbToEntry(row: typeof worldinfoEntries.$inferSelect): WorldInfoEntry {
    return {
      uid: row.uid,
      key: row.keys[0] ?? "",
      keysecondary: row.keysecondary,
      comment: row.comment ?? "",
      content: row.content,
      constant: row.constant,
      vectorized: row.vectorized,
      selective: row.selective,
      selectiveLogic: row.selectiveLogic,
      addMemo: row.addMemo,
      order: row.order,
      position: row.position,
      disable: row.disable,
      excludeRecursion: row.excludeRecursion,
      preventRecursion: row.preventRecursion,
      delayUntilRecursion: row.delayUntilRecursion,
      probability: row.probability,
      useProbability: row.useProbability,
      depth: row.depth,
      group: Number(row.group) ?? 0,
      groupOverride: row.groupOverride,
      groupWeight: row.groupWeight,
      scanDepth: row.scanDepth ?? 0,
      caseSensitive: row.caseSensitive ?? false,
      matchWholeWords: row.matchWholeWords ?? false,
      automationId: row.automationId ?? "",
      role: row.role ?? "",
      sticky: Boolean(row.sticky),
      cooldown: row.cooldown ?? 0,
      delay: row.delay ?? 0,
      matchPersonaDescription: row.matchPersonaDescription,
      matchCharacterDescription: row.matchCharacterDescription,
      matchCharacterPersonality: row.matchCharacterPersonality,
      matchCharacterDepthPrompt: row.matchCharacterDepthPrompt,
      matchScenario: row.matchScenario,
      matchCreatorNotes: row.matchCreatorNotes,
      triggers: "",
      ignoreBudget: row.ignoreBudget,
      extensions: row.extensions ?? {},
    }
  }

  async create(name: string, entries: WorldInfoEntry[]): Promise<number> {
    const fileName = this.fileNameFromName(name)
    const filePath = this.wiFilePath(fileName)

    if (await exists(filePath)) {
      throw new ConflictError(`World Info file "${fileName}" already exists`)
    }

    const entriesRecord: Record<string, WorldInfoEntry> = {}
    for (const entry of entries) {
      entriesRecord[entry.uid] = entry
    }

    const wiData: WorldInfo = {
      name,
      entries: entriesRecord,
    }

    await writeFile(filePath, JSON.stringify(wiData, null, 2))

    const fileResult = await db
      .insert(worldinfoFiles)
      .values({
        fileName,
        name,
        userId: this.userId,
      })
      .returning()

    const fileId = Number(fileResult[0]!.id)

    for (const entry of entries) {
      await db.insert(worldinfoEntries).values({
        ...this.entryToDb(entry),
        fileId,
      })
    }

    return fileId
  }

  async get(fileId: number): Promise<WorldInfo | null> {
    const fileRows = await db
      .select()
      .from(worldinfoFiles)
      .where(eq(worldinfoFiles.id, fileId))
      .limit(1)

    if (fileRows.length === 0) return null

    const fileRow = fileRows[0]!
    const filePath = this.wiFilePath(fileRow.fileName)

    if (!(await exists(filePath))) return null

    const rawData = await readFile(filePath, "utf-8")
    return JSON.parse(rawData) as WorldInfo
  }

  async getAll(): Promise<Array<{ id: number; name: string; entryCount: number }>> {
    const files = await db.select().from(worldinfoFiles)

    const result: Array<{ id: number; name: string; entryCount: number }> = []
    for (const file of files) {
      const entries = await db
        .select()
        .from(worldinfoEntries)
        .where(eq(worldinfoEntries.fileId, Number(file.id)))

      result.push({
        id: Number(file.id),
        name: file.name,
        entryCount: entries.length,
      })
    }

    return result
  }

  async update(fileId: number, data: Partial<WorldInfo>): Promise<void> {
    const fileRows = await db
      .select()
      .from(worldinfoFiles)
      .where(eq(worldinfoFiles.id, fileId))
      .limit(1)

    if (fileRows.length === 0) {
      throw new NotFoundError(`World Info file with id ${fileId}`)
    }

    const fileRow = fileRows[0]!
    const filePath = this.wiFilePath(fileRow.fileName)

    if (!(await exists(filePath))) {
      throw new NotFoundError(`World Info file "${fileRow.fileName}" on disk`)
    }

    const currentData = JSON.parse(await readFile(filePath, "utf-8")) as WorldInfo
    const updatedData: WorldInfo = {
      name: data.name ?? currentData.name,
      entries: data.entries ?? currentData.entries,
      extensions: data.extensions ?? currentData.extensions,
    }

    await writeFile(filePath, JSON.stringify(updatedData, null, 2))

    if (data.name !== undefined) {
      await db
        .update(worldinfoFiles)
        .set({ name: data.name })
        .where(eq(worldinfoFiles.id, fileId))
    }
  }

  async delete(fileId: number): Promise<void> {
    const fileRows = await db
      .select()
      .from(worldinfoFiles)
      .where(eq(worldinfoFiles.id, fileId))
      .limit(1)

    if (fileRows.length === 0) {
      throw new NotFoundError(`World Info file with id ${fileId}`)
    }

    const fileRow = fileRows[0]!
    const filePath = this.wiFilePath(fileRow.fileName)

    await removeFile(filePath)
    await db.delete(worldinfoEntries).where(eq(worldinfoEntries.fileId, fileId))
    await db.delete(worldinfoFiles).where(eq(worldinfoFiles.id, fileId))
  }

  async addEntry(fileId: number, entry: WorldInfoEntry): Promise<void> {
    const fileRows = await db
      .select()
      .from(worldinfoFiles)
      .where(eq(worldinfoFiles.id, fileId))
      .limit(1)

    if (fileRows.length === 0) {
      throw new NotFoundError(`World Info file with id ${fileId}`)
    }

    const fileRow = fileRows[0]!
    const filePath = this.wiFilePath(fileRow.fileName)

    const currentData = JSON.parse(await readFile(filePath, "utf-8")) as WorldInfo

    if (currentData.entries[entry.uid]) {
      throw new ConflictError(`Entry with uid "${entry.uid}" already exists`)
    }

    currentData.entries[entry.uid] = entry
    await writeFile(filePath, JSON.stringify(currentData, null, 2))

    await db.insert(worldinfoEntries).values({
      ...this.entryToDb(entry),
      fileId,
    })
  }

  async updateEntry(fileId: number, uid: string, entry: WorldInfoEntry): Promise<void> {
    const fileRows = await db
      .select()
      .from(worldinfoFiles)
      .where(eq(worldinfoFiles.id, fileId))
      .limit(1)

    if (fileRows.length === 0) {
      throw new NotFoundError(`World Info file with id ${fileId}`)
    }

    const fileRow = fileRows[0]!
    const filePath = this.wiFilePath(fileRow.fileName)

    const currentData = JSON.parse(await readFile(filePath, "utf-8")) as WorldInfo

    if (!currentData.entries[uid]) {
      throw new NotFoundError(`Entry with uid "${uid}"`)
    }

    currentData.entries[uid] = entry
    await writeFile(filePath, JSON.stringify(currentData, null, 2))

    await db
      .update(worldinfoEntries)
      .set(this.entryToDb(entry))
      .where(and(eq(worldinfoEntries.uid, uid), eq(worldinfoEntries.fileId, fileId)))
  }

  async deleteEntry(fileId: number, uid: string): Promise<void> {
    const fileRows = await db
      .select()
      .from(worldinfoFiles)
      .where(eq(worldinfoFiles.id, fileId))
      .limit(1)

    if (fileRows.length === 0) {
      throw new NotFoundError(`World Info file with id ${fileId}`)
    }

    const fileRow = fileRows[0]!
    const filePath = this.wiFilePath(fileRow.fileName)

    const currentData = JSON.parse(await readFile(filePath, "utf-8")) as WorldInfo

    if (!currentData.entries[uid]) {
      throw new NotFoundError(`Entry with uid "${uid}"`)
    }

    delete currentData.entries[uid]
    await writeFile(filePath, JSON.stringify(currentData, null, 2))

    await db
      .delete(worldinfoEntries)
      .where(and(eq(worldinfoEntries.uid, uid), eq(worldinfoEntries.fileId, fileId)))
  }

  async importWi(jsonPath: string): Promise<number> {
    const rawData = await readFile(jsonPath, "utf-8")
    const wiData = JSON.parse(rawData) as WorldInfo

    const fileName = this.fileNameFromName(wiData.name)
    const destPath = this.wiFilePath(fileName)

    if (await exists(destPath)) {
      throw new ConflictError(`World Info file "${fileName}" already exists`)
    }

    await writeFile(destPath, JSON.stringify(wiData, null, 2))

    const fileResult = await db
      .insert(worldinfoFiles)
      .values({
        fileName,
        name: wiData.name,
        userId: this.userId,
      })
      .returning()

    const fileId = Number(fileResult[0]!.id)

    const entries = Object.values(wiData.entries) as WorldInfoEntry[]
    for (const entry of entries) {
      await db.insert(worldinfoEntries).values({
        ...this.entryToDb(entry),
        fileId,
      })
    }

    return fileId
  }

  async exportWi(fileId: number): Promise<{ data: Buffer; fileName: string }> {
    const fileRows = await db
      .select()
      .from(worldinfoFiles)
      .where(eq(worldinfoFiles.id, fileId))
      .limit(1)

    if (fileRows.length === 0) {
      throw new NotFoundError(`World Info file with id ${fileId}`)
    }

    const fileRow = fileRows[0]!
    const filePath = this.wiFilePath(fileRow.fileName)

    if (!(await exists(filePath))) {
      throw new NotFoundError(`World Info file "${fileRow.fileName}" on disk`)
    }

    const data = await readFile(filePath)
    return { data, fileName: fileRow.fileName }
  }
}

export const worldInfoService = new WorldInfoService()
