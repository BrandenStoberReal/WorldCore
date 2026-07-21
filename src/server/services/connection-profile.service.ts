import { eq, and } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { connectionProfiles, users } from '@/server/db/schema';
import { NotFoundError } from '@/server/errors';
import type {
  ConnectionProfileCreateInput,
  ConnectionProfileUpdateInput,
  ConnectionProfile,
} from '@/shared/schemas/connection-profile';

function generateId(): string {
  return crypto.randomUUID();
}

export const connectionProfileService = {
  async create(userId: string, input: ConnectionProfileCreateInput): Promise<ConnectionProfile> {
    const id = generateId();
    const now = new Date();
    const profile: ConnectionProfile = {
      ...input,
      id,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await db.insert(connectionProfiles).values({
      id,
      userId,
      name: input.name,
      data: JSON.stringify(profile),
      createdAt: now,
      updatedAt: now,
    });

    return profile;
  },

  async getAll(userId: string): Promise<ConnectionProfile[]> {
    const rows = await db
      .select()
      .from(connectionProfiles)
      .where(eq(connectionProfiles.userId, userId));
    const profiles = rows.map((row) => JSON.parse(row.data) as ConnectionProfile);

    if (profiles.length === 0) {
      try {
        const defaultProfile = await this.createDefault(userId);
        return [defaultProfile];
      } catch {
        return [];
      }
    }

    return profiles;
  },

  async createDefault(userId: string): Promise<ConnectionProfile> {
    const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (existing.length === 0) {
      await db.insert(users).values({
        id: userId,
        handle: userId,
        name: userId,
        role: 'admin',
        enabled: true,
        createdAt: Math.floor(Date.now() / 1000),
      });
    }

    const id = 'default';
    const now = new Date();
    const profile: ConnectionProfile = {
      id,
      name: 'Default',
      api: 'openai',
      model: '',
      mode: 'chat',
      isDefault: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await db.insert(connectionProfiles).values({
      id,
      userId,
      name: profile.name,
      data: JSON.stringify(profile),
      createdAt: now,
      updatedAt: now,
    });

    return profile;
  },

  async getOne(userId: string, id: string): Promise<ConnectionProfile | null> {
    const rows = await db
      .select()
      .from(connectionProfiles)
      .where(and(eq(connectionProfiles.userId, userId), eq(connectionProfiles.id, id)));
    if (rows.length === 0) return null;
    return JSON.parse(rows[0]!.data) as ConnectionProfile;
  },

  async getOneOrThrow(userId: string, id: string): Promise<ConnectionProfile> {
    const profile = await this.getOne(userId, id);
    if (!profile) {
      throw new NotFoundError(`Connection profile "${id}"`);
    }
    return profile;
  },

  async update(
    userId: string,
    id: string,
    input: ConnectionProfileUpdateInput,
  ): Promise<ConnectionProfile> {
    const existing = await this.getOneOrThrow(userId, id);

    const updated: ConnectionProfile = {
      ...existing,
      ...input,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };

    await db
      .update(connectionProfiles)
      .set({
        name: updated.name,
        data: JSON.stringify(updated),
        updatedAt: new Date(),
      })
      .where(and(eq(connectionProfiles.userId, userId), eq(connectionProfiles.id, id)));

    return updated;
  },

  async delete(userId: string, id: string): Promise<void> {
    await this.getOneOrThrow(userId, id);
    await db
      .delete(connectionProfiles)
      .where(and(eq(connectionProfiles.userId, userId), eq(connectionProfiles.id, id)));
  },
};
