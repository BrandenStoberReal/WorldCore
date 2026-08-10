import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { db } from '@/server/db/client';
import { worldinfoFiles, worldinfoEntries } from '@/server/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { paths } from '@/server/storage/paths';
import { writeFile, readFile, removeFile, exists } from '@/server/storage/fs';
import type { WorldInfo, WorldInfoEntry } from '@/shared/types/worldinfo';
import { NotFoundError, ConflictError, ValidationError } from '@/server/errors';
import { dbToCharacterBookEntry, type CharacterBookEntry } from '@/server/services/prompt-builder';

export class WorldInfoService {
  private wiFilePath(fileName: string): string {
    return path.join(paths.worlds, fileName);
  }

  private fileNameFromName(name: string): string {
    return `${name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
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
    };
  }

  private dbToEntry(row: typeof worldinfoEntries.$inferSelect): WorldInfoEntry {
    return {
      uid: row.uid,
      key: row.keys[0] ?? '',
      keysecondary: row.keysecondary,
      comment: row.comment ?? '',
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
      automationId: row.automationId ?? '',
      role: row.role ?? '',
      sticky: Boolean(row.sticky),
      cooldown: row.cooldown ?? 0,
      delay: row.delay ?? 0,
      matchPersonaDescription: row.matchPersonaDescription,
      matchCharacterDescription: row.matchCharacterDescription,
      matchCharacterPersonality: row.matchCharacterPersonality,
      matchCharacterDepthPrompt: row.matchCharacterDepthPrompt,
      matchScenario: row.matchScenario,
      matchCreatorNotes: row.matchCreatorNotes,
      triggers: '',
      ignoreBudget: row.ignoreBudget,
      extensions: row.extensions ?? {},
    };
  }

  async create(name: string, entries: WorldInfoEntry[], userId: string): Promise<number> {
    const fileName = this.fileNameFromName(name);
    const filePath = this.wiFilePath(fileName);

    if (await exists(filePath)) {
      throw new ConflictError(`World Info file "${fileName}" already exists`);
    }

    const entriesRecord: Record<string, WorldInfoEntry> = {};
    for (const entry of entries) {
      entriesRecord[entry.uid] = entry;
    }

    const wiData: WorldInfo = {
      name,
      entries: entriesRecord,
    };

    await writeFile(filePath, JSON.stringify(wiData, null, 2));

    const fileResult = await db
      .insert(worldinfoFiles)
      .values({
        fileName,
        name,
        userId,
      })
      .returning();

    const fileId = Number(fileResult[0]!.id);

    if (entries.length > 0) {
      await db.insert(worldinfoEntries).values(
        entries.map((entry) => ({
          ...this.entryToDb(entry),
          fileId,
        })),
      );
    }

    return fileId;
  }

  async get(fileId: number, userId: string): Promise<WorldInfo | null> {
    const fileRows = await db
      .select()
      .from(worldinfoFiles)
      .where(and(eq(worldinfoFiles.id, fileId), eq(worldinfoFiles.userId, userId)))
      .limit(1);

    if (fileRows.length === 0) return null;

    const fileRow = fileRows[0]!;
    const filePath = this.wiFilePath(fileRow.fileName);

    if (!(await exists(filePath))) return null;

    const rawData = await readFile(filePath, 'utf-8');
    return JSON.parse(rawData) as WorldInfo;
  }

  async getAll(userId: string): Promise<Array<{ id: number; name: string; entryCount: number }>> {
    const filesWithCounts = await db
      .select({
        id: worldinfoFiles.id,
        name: worldinfoFiles.name,
        entryCount: count(worldinfoEntries.id),
      })
      .from(worldinfoFiles)
      .leftJoin(worldinfoEntries, eq(worldinfoFiles.id, worldinfoEntries.fileId))
      .where(eq(worldinfoFiles.userId, userId))
      .groupBy(worldinfoFiles.id);

    return filesWithCounts.map((row) => ({
      id: Number(row.id),
      name: row.name,
      entryCount: Number(row.entryCount),
    }));
  }

  async update(fileId: number, data: Partial<WorldInfo>, userId: string): Promise<void> {
    const fileRows = await db
      .select()
      .from(worldinfoFiles)
      .where(and(eq(worldinfoFiles.id, fileId), eq(worldinfoFiles.userId, userId)))
      .limit(1);

    if (fileRows.length === 0) {
      throw new NotFoundError(`World Info file with id ${fileId}`);
    }

    const fileRow = fileRows[0]!;
    const filePath = this.wiFilePath(fileRow.fileName);

    if (!(await exists(filePath))) {
      throw new NotFoundError(`World Info file "${fileRow.fileName}" on disk`);
    }

    // Read current data with retry for concurrent access
    let currentData: WorldInfo;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        currentData = JSON.parse(await readFile(filePath, 'utf-8')) as WorldInfo;
        break;
      } catch {
        if (attempt === 2) throw new NotFoundError(`World Info file "${fileRow.fileName}" on disk`);
        await new Promise((r) => setTimeout(r, 10 * (attempt + 1)));
      }
    }

    const updatedData: WorldInfo = {
      name: data.name ?? currentData!.name,
      entries: data.entries ?? currentData!.entries,
      extensions: data.extensions ?? currentData!.extensions,
    };

    // DB is source of truth; file write is best-effort
    if (data.name !== undefined) {
      await db
        .update(worldinfoFiles)
        .set({ name: data.name })
        .where(and(eq(worldinfoFiles.id, fileId), eq(worldinfoFiles.userId, userId)));
    }

    if (data.entries !== undefined) {
      await db.delete(worldinfoEntries).where(eq(worldinfoEntries.fileId, fileId));

      const entries = Object.values(data.entries) as WorldInfoEntry[];
      if (entries.length > 0) {
        await db.insert(worldinfoEntries).values(
          entries.map((entry) => ({
            ...this.entryToDb(entry),
            fileId,
          })),
        );
      }
    }

    // File write is secondary; log failure but don't fail request
    try {
      await writeFile(filePath, JSON.stringify(updatedData, null, 2));
    } catch (err) {
      console.error(`[worldinfo] Failed to write file ${fileRow.fileName}:`, err);
    }
  }

  async delete(fileId: number, userId: string): Promise<void> {
    const fileRows = await db
      .select()
      .from(worldinfoFiles)
      .where(and(eq(worldinfoFiles.id, fileId), eq(worldinfoFiles.userId, userId)))
      .limit(1);

    if (fileRows.length === 0) {
      throw new NotFoundError(`World Info file with id ${fileId}`);
    }

    const fileRow = fileRows[0]!;
    const filePath = this.wiFilePath(fileRow.fileName);

    await db.delete(worldinfoEntries).where(eq(worldinfoEntries.fileId, fileId));
    await db
      .delete(worldinfoFiles)
      .where(and(eq(worldinfoFiles.id, fileId), eq(worldinfoFiles.userId, userId)));

    try {
      await removeFile(filePath);
    } catch (err) {
      console.error(`[worldinfo] Failed to remove file ${fileRow.fileName}:`, err);
    }
  }

  async addEntry(fileId: number, entry: WorldInfoEntry, userId: string): Promise<void> {
    const fileRows = await db
      .select()
      .from(worldinfoFiles)
      .where(and(eq(worldinfoFiles.id, fileId), eq(worldinfoFiles.userId, userId)))
      .limit(1);

    if (fileRows.length === 0) {
      throw new NotFoundError(`World Info file with id ${fileId}`);
    }

    const fileRow = fileRows[0]!;
    const filePath = this.wiFilePath(fileRow.fileName);

    await db.insert(worldinfoEntries).values({
      ...this.entryToDb(entry),
      fileId,
    });

    try {
      const currentData = JSON.parse(await readFile(filePath, 'utf-8')) as WorldInfo;
      if (!currentData.entries[entry.uid]) {
        currentData.entries[entry.uid] = entry;
      }
      await writeFile(filePath, JSON.stringify(currentData, null, 2));
    } catch (err) {
      console.error(`[worldinfo] Failed to sync entry to file for ${fileRow.fileName}:`, err);
    }
  }

  async updateEntry(
    fileId: number,
    uid: string,
    entry: WorldInfoEntry,
    userId: string,
  ): Promise<void> {
    const fileRows = await db
      .select()
      .from(worldinfoFiles)
      .where(and(eq(worldinfoFiles.id, fileId), eq(worldinfoFiles.userId, userId)))
      .limit(1);

    if (fileRows.length === 0) {
      throw new NotFoundError(`World Info file with id ${fileId}`);
    }

    const fileRow = fileRows[0]!;
    const filePath = this.wiFilePath(fileRow.fileName);

    await db
      .update(worldinfoEntries)
      .set(this.entryToDb(entry))
      .where(and(eq(worldinfoEntries.uid, uid), eq(worldinfoEntries.fileId, fileId)));

    try {
      const currentData = JSON.parse(await readFile(filePath, 'utf-8')) as WorldInfo;
      if (currentData.entries[uid]) {
        currentData.entries[uid] = entry;
      }
      await writeFile(filePath, JSON.stringify(currentData, null, 2));
    } catch (err) {
      console.error(`[worldinfo] Failed to sync entry update to file for ${fileRow.fileName}:`, err);
    }
  }

  async deleteEntry(fileId: number, uid: string, userId: string): Promise<void> {
    const fileRows = await db
      .select()
      .from(worldinfoFiles)
      .where(and(eq(worldinfoFiles.id, fileId), eq(worldinfoFiles.userId, userId)))
      .limit(1);

    if (fileRows.length === 0) {
      throw new NotFoundError(`World Info file with id ${fileId}`);
    }

    const fileRow = fileRows[0]!;
    const filePath = this.wiFilePath(fileRow.fileName);

    await db
      .delete(worldinfoEntries)
      .where(and(eq(worldinfoEntries.uid, uid), eq(worldinfoEntries.fileId, fileId)));

    try {
      const currentData = JSON.parse(await readFile(filePath, 'utf-8')) as WorldInfo;
      if (currentData.entries[uid]) {
        delete currentData.entries[uid];
        await writeFile(filePath, JSON.stringify(currentData, null, 2));
      }
    } catch (err) {
      console.error(`[worldinfo] Failed to sync entry deletion to file for ${fileRow.fileName}:`, err);
    }
  }

  async importWi(jsonPath: string, userId: string): Promise<number> {
    const resolved = path.resolve(jsonPath);
    const worldsDir = path.resolve(paths.worlds);
    if (!resolved.startsWith(worldsDir + path.sep) && resolved !== worldsDir) {
      throw new ValidationError({ message: 'import path must be within worlds directory' });
    }

    const rawData = await readFile(jsonPath, 'utf-8');
    const wiData = JSON.parse(rawData) as WorldInfo;

    const fileName = this.fileNameFromName(wiData.name);
    const destPath = this.wiFilePath(fileName);

    if (await exists(destPath)) {
      throw new ConflictError(`World Info file "${fileName}" already exists`);
    }

    await writeFile(destPath, JSON.stringify(wiData, null, 2));

    const fileResult = await db
      .insert(worldinfoFiles)
      .values({
        fileName,
        name: wiData.name,
        userId,
      })
      .returning();

    const fileId = Number(fileResult[0]!.id);

    const entries = Object.values(wiData.entries) as WorldInfoEntry[];
    if (entries.length > 0) {
      await db.insert(worldinfoEntries).values(
        entries.map((entry) => ({
          ...this.entryToDb(entry),
          fileId,
        })),
      );
    }

    return fileId;
  }

  async exportWi(fileId: number, userId: string): Promise<{ data: Buffer; fileName: string }> {
    const fileRows = await db
      .select()
      .from(worldinfoFiles)
      .where(and(eq(worldinfoFiles.id, fileId), eq(worldinfoFiles.userId, userId)))
      .limit(1);

    if (fileRows.length === 0) {
      throw new NotFoundError(`World Info file with id ${fileId}`);
    }

    const fileRow = fileRows[0]!;
    const filePath = this.wiFilePath(fileRow.fileName);

    if (!(await exists(filePath))) {
      throw new NotFoundError(`World Info file "${fileRow.fileName}" on disk`);
    }

    const data = await readFile(filePath);
    return { data, fileName: fileRow.fileName };
  }
}

export const worldInfoService = new WorldInfoService();
