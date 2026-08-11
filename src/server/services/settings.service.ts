import { randomUUID } from 'node:crypto';
import { db } from '@/server/db/client';
import { settings, settingsSnapshots } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { writeFileAtomic, readFile, exists } from '@/server/storage/fs';
import path from 'node:path';
import { USER_ROOT } from '@/server/storage/paths';

const SETTINGS_FILE = path.join(USER_ROOT, 'settings.json');

export class SettingsService {
  async get(userId: string = 'default-user'): Promise<Record<string, unknown>> {
    const settingsFile = path.join(
      USER_ROOT,
      userId === 'default-user' ? 'settings.json' : `${userId}_settings.json`,
    );
    if (userId === 'default-user' && (await exists(SETTINGS_FILE))) {
      try {
        const content = await readFile(SETTINGS_FILE, 'utf-8');
        return JSON.parse(content) as Record<string, unknown>;
      } catch {
        // Fall through to DB
      }
    }

    const row = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
    if (row.length > 0) {
      return row[0]!.data as Record<string, unknown>;
    }

    return {};
  }

  async save(data: Record<string, unknown>, userId: string = 'default-user'): Promise<void> {
    if (userId === 'default-user') {
      await writeFileAtomic(SETTINGS_FILE, JSON.stringify(data, null, 2));
    }

    const existing = await db
      .select({ id: settings.id })
      .from(settings)
      .where(eq(settings.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(settings)
        .set({ data: data as unknown as Record<string, unknown>, updatedAt: Date.now() })
        .where(eq(settings.userId, userId));
    } else {
      await db.insert(settings).values({
        userId,
        data: data as unknown as Record<string, unknown>,
        updatedAt: Date.now(),
      });
    }
  }

  async getSnapshots(
    userId: string = 'default-user',
  ): Promise<Array<{ id: string; name: string; createdAt: number }>> {
    const rows = await db
      .select({
        id: settingsSnapshots.id,
        name: settingsSnapshots.name,
        createdAt: settingsSnapshots.createdAt,
      })
      .from(settingsSnapshots)
      .where(eq(settingsSnapshots.userId, userId));
    return rows;
  }

  async makeSnapshot(name: string, userId: string = 'default-user'): Promise<string> {
    const currentSettings = await this.get(userId);
    const id = randomUUID();
    await db.insert(settingsSnapshots).values({
      id,
      name,
      userId,
      data: currentSettings as unknown as Record<string, unknown>,
      createdAt: Date.now(),
    });
    return id;
  }

  async loadSnapshot(id: string, userId: string): Promise<Record<string, unknown>> {
    const row = await db
      .select()
      .from(settingsSnapshots)
      .where(and(eq(settingsSnapshots.id, id), eq(settingsSnapshots.userId, userId)))
      .limit(1);
    if (row.length === 0) {
      throw new Error('Snapshot not found');
    }
    return row[0]!.data as Record<string, unknown>;
  }

  async restoreSnapshot(id: string, userId: string): Promise<void> {
    const data = await this.loadSnapshot(id, userId);
    await this.save(data, userId);
  }
}

export const settingsService = new SettingsService();
