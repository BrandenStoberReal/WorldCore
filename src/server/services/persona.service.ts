import { db } from '@/server/db/client';
import { personas } from '@/server/db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { NotFoundError } from '@/server/errors';
import type { Persona, PersonaCreateInput, PersonaEditInput } from '@/shared/types/persona';

type PersonaRow = typeof personas.$inferSelect;

function toPersona(row: PersonaRow): Persona {
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description,
    personality: row.personality,
    scenario: row.scenario,
    systemPrompt: row.systemPrompt,
    avatar: row.avatar,
    isDefault: row.isDefault,
    dateAdded: row.dateAdded,
    dateModified: row.dateModified,
  };
}

export const personaService = {
  async create(input: PersonaCreateInput, userId: string): Promise<{ id: number }> {
    const now = Date.now();
    const values = {
      name: input.name,
      description: input.description,
      personality: input.personality,
      scenario: input.scenario,
      systemPrompt: input.systemPrompt,
      avatar: input.avatar,
      isDefault: input.isDefault,
      userId,
      dateAdded: now,
      dateModified: now,
    };

    let result: { id: number | bigint }[];
    if (input.isDefault) {
      result = await db.transaction(async (tx) => {
        await tx.update(personas).set({ isDefault: false }).where(eq(personas.userId, userId));
        return tx.insert(personas).values(values).returning({ id: personas.id });
      });
    } else {
      result = await db.insert(personas).values(values).returning({ id: personas.id });
    }

    return { id: Number(result[0]!.id) };
  },

  async edit(id: number, userId: string, patch: PersonaEditInput): Promise<void> {
    const rows = await db
      .select({ id: personas.id })
      .from(personas)
      .where(and(eq(personas.id, id), eq(personas.userId, userId)))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundError(`Persona with id ${id}`);
    }

    const update: Record<string, unknown> = { dateModified: Date.now() };
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.description !== undefined) update.description = patch.description;
    if (patch.personality !== undefined) update.personality = patch.personality;
    if (patch.scenario !== undefined) update.scenario = patch.scenario;
    if (patch.systemPrompt !== undefined) update.systemPrompt = patch.systemPrompt;

    await db
      .update(personas)
      .set(update)
      .where(and(eq(personas.id, id), eq(personas.userId, userId)));
  },

  async setDefault(id: number, userId: string): Promise<void> {
    const rows = await db
      .select({ id: personas.id })
      .from(personas)
      .where(and(eq(personas.id, id), eq(personas.userId, userId)))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundError(`Persona with id ${id}`);
    }

    await db.transaction(async (tx) => {
      await tx.update(personas).set({ isDefault: false }).where(eq(personas.userId, userId));
      await tx
        .update(personas)
        .set({ isDefault: true, dateModified: Date.now() })
        .where(and(eq(personas.id, id), eq(personas.userId, userId)));
    });
  },

  async get(id: number, userId: string): Promise<Persona | null> {
    const rows = await db
      .select()
      .from(personas)
      .where(and(eq(personas.id, id), eq(personas.userId, userId)))
      .limit(1);
    if (rows.length === 0) return null;
    return toPersona(rows[0]!);
  },

  async getDefault(userId: string): Promise<Persona | null> {
    const rows = await db
      .select()
      .from(personas)
      .where(and(eq(personas.isDefault, true), eq(personas.userId, userId)))
      .limit(1);
    if (rows.length === 0) return null;
    return toPersona(rows[0]!);
  },

  async getAll(userId: string): Promise<Persona[]> {
    const rows = await db
      .select()
      .from(personas)
      .where(eq(personas.userId, userId))
      .orderBy(desc(personas.dateAdded), asc(personas.name));
    return rows.map(toPersona);
  },

  async setAvatar(id: number, userId: string, avatarFileName: string): Promise<void> {
    const rows = await db
      .select({ id: personas.id })
      .from(personas)
      .where(and(eq(personas.id, id), eq(personas.userId, userId)))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundError(`Persona with id ${id}`);
    }

    await db
      .update(personas)
      .set({ avatar: avatarFileName, dateModified: Date.now() })
      .where(and(eq(personas.id, id), eq(personas.userId, userId)));
  },

  async rename(id: number, userId: string, name: string): Promise<void> {
    const rows = await db
      .select({ id: personas.id })
      .from(personas)
      .where(and(eq(personas.id, id), eq(personas.userId, userId)))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundError(`Persona with id ${id}`);
    }

    await db
      .update(personas)
      .set({ name, dateModified: Date.now() })
      .where(and(eq(personas.id, id), eq(personas.userId, userId)));
  },

  async delete(id: number, userId: string): Promise<void> {
    const rows = await db
      .select({ id: personas.id, isDefault: personas.isDefault })
      .from(personas)
      .where(and(eq(personas.id, id), eq(personas.userId, userId)))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundError(`Persona with id ${id}`);
    }

    if (rows[0]!.isDefault) {
      throw new Error('Cannot delete the default persona');
    }

    await db.delete(personas).where(and(eq(personas.id, id), eq(personas.userId, userId)));
  },
};
