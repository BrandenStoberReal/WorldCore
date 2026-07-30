import { eq, and } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { connectionProfiles } from '@/server/db/schema';
import { NotFoundError } from '@/server/errors';
import {
  ConnectionProfileSchema,
  type ConnectionProfileCreateInput,
  type ConnectionProfileUpdateInput,
  type ConnectionProfile,
} from '@/shared/schemas/connection-profile';

function generateId(): string {
  return crypto.randomUUID();
}

function parseProfile(data: string): ConnectionProfile {
  const raw = JSON.parse(data) as Record<string, unknown>;
  return ConnectionProfileSchema.parse(raw);
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
    return rows.map((row) => parseProfile(row.data));
  },

  async getOne(userId: string, id: string): Promise<ConnectionProfile | null> {
    const rows = await db
      .select()
      .from(connectionProfiles)
      .where(and(eq(connectionProfiles.userId, userId), eq(connectionProfiles.id, id)));
    if (rows.length === 0) return null;
    return parseProfile(rows[0]!.data);
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
      id,
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
