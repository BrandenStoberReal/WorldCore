import { randomUUID } from "node:crypto"
import { db } from "@/server/db/client"
import { settings, settingsSnapshots } from "@/server/db/schema"
import { eq } from "drizzle-orm"
import { writeFileAtomic, readFile, exists } from "@/server/storage/fs"
import path from "node:path"
import { USER_ROOT } from "@/server/storage/paths"

const SETTINGS_FILE = path.join(USER_ROOT, "settings.json")

export class SettingsService {
  private userId = "default-user"

  async get(): Promise<Record<string, unknown>> {
    if (await exists(SETTINGS_FILE)) {
      try {
        const content = await readFile(SETTINGS_FILE, "utf-8")
        return JSON.parse(content) as Record<string, unknown>
      } catch {
        // Fall through to DB
      }
    }

    const row = await db
      .select()
      .from(settings)
      .where(eq(settings.userId, this.userId))
      .limit(1)
    if (row.length > 0) {
      return row[0]!.data as Record<string, unknown>
    }

    return {}
  }

  async save(data: Record<string, unknown>): Promise<void> {
    await writeFileAtomic(SETTINGS_FILE, JSON.stringify(data, null, 2))

    const existing = await db
      .select({ id: settings.id })
      .from(settings)
      .where(eq(settings.userId, this.userId))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(settings)
        .set({ data: data as unknown as Record<string, unknown>, updatedAt: Date.now() })
        .where(eq(settings.userId, this.userId))
    } else {
      await db.insert(settings).values({
        userId: this.userId,
        data: data as unknown as Record<string, unknown>,
        updatedAt: Date.now(),
      })
    }
  }

  async getSnapshots(): Promise<
    Array<{ id: string; name: string; createdAt: number }>
  > {
    const rows = await db
      .select({
        id: settingsSnapshots.id,
        name: settingsSnapshots.name,
        createdAt: settingsSnapshots.createdAt,
      })
      .from(settingsSnapshots)
      .where(eq(settingsSnapshots.userId, this.userId))
    return rows
  }

  async makeSnapshot(name: string): Promise<string> {
    const currentSettings = await this.get()
    const id = randomUUID()
    await db.insert(settingsSnapshots).values({
      id,
      name,
      userId: this.userId,
      data: currentSettings as unknown as Record<string, unknown>,
      createdAt: Date.now(),
    })
    return id
  }

  async loadSnapshot(id: string): Promise<Record<string, unknown>> {
    const row = await db
      .select()
      .from(settingsSnapshots)
      .where(eq(settingsSnapshots.id, id))
      .limit(1)
    if (row.length === 0) {
      throw new Error("Snapshot not found")
    }
    return row[0]!.data as Record<string, unknown>
  }

  async restoreSnapshot(id: string): Promise<void> {
    const data = await this.loadSnapshot(id)
    await this.save(data)
  }
}

export const settingsService = new SettingsService()
