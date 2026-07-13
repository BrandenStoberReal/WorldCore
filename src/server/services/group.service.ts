import path from "node:path"
import { randomUUID } from "node:crypto"
import { db } from "@/server/db/client"
import { groups } from "@/server/db/schema"
import { eq } from "drizzle-orm"
import { paths } from "@/server/storage/paths"
import { writeFile, readFile, removeFile, exists } from "@/server/storage/fs"
import type { Group, GroupCreateInput } from "@/shared/types/group"
import { NotFoundError, ConflictError } from "@/server/errors"

export class GroupService {
  private userId = "default-user"

  private groupPath(id: string): string {
    return path.join(paths.groups, `${id}.json`)
  }

  private buildGroup(row: typeof groups.$inferSelect): Group {
    return {
      id: row.id,
      name: row.name,
      members: row.members,
      avatar_url: row.avatarUrl || undefined,
      allow_self_responses: row.allowSelfResponses,
      activation_strategy: row.activationStrategy,
      generation_mode: row.generationMode,
      disabled_members: row.disabledMembers,
      fav: row.fav,
      chat_id: row.chatId || undefined,
      chats: row.chats,
      auto_mode_delay: row.autoModeDelay,
      generation_mode_join_prefix: row.genModeJoinPrefix || "",
      generation_mode_join_suffix: row.genModeJoinSuffix || "",
      date_added: row.dateAdded ? new Date(row.dateAdded).toISOString() : undefined,
      create_date: row.createDate,
      date_last_chat: row.dateLastChat ? new Date(row.dateLastChat).toISOString() : undefined,
      chat_size: row.chatSize,
    }
  }

  async create(input: GroupCreateInput): Promise<Group> {
    const id = randomUUID()
    const now = Date.now()
    const createDate = new Date(now).toISOString()

    const group: Group = {
      id,
      name: input.name,
      members: input.members,
      avatar_url: input.avatar_url,
      allow_self_responses: input.allow_self_responses ?? false,
      activation_strategy: input.activation_strategy ?? 0,
      generation_mode: input.generation_mode ?? 0,
      disabled_members: input.disabled_members ?? [],
      fav: false,
      chats: [],
      auto_mode_delay: 5,
      generation_mode_join_prefix: "",
      generation_mode_join_suffix: "",
      create_date: createDate,
      chat_size: 0,
    }

    await writeFile(this.groupPath(id), JSON.stringify(group, null, 2))

    await db.insert(groups).values({
      id,
      name: input.name,
      members: input.members,
      avatarUrl: input.avatar_url ?? "",
      allowSelfResponses: input.allow_self_responses ?? false,
      activationStrategy: input.activation_strategy ?? 0,
      generationMode: input.generation_mode ?? 0,
      disabledMembers: input.disabled_members ?? [],
      fav: false,
      chatId: "",
      chats: [],
      autoModeDelay: 5,
      genModeJoinPrefix: "",
      genModeJoinSuffix: "",
      dateAdded: now,
      createDate,
      dateLastChat: 0,
      chatSize: 0,
      userId: this.userId,
    })

    return group
  }

  async get(id: string): Promise<Group | null> {
    const rows = await db.select().from(groups).where(eq(groups.id, id)).limit(1)
    if (rows.length === 0) return null
    return this.buildGroup(rows[0]!)
  }

  async getAll(): Promise<Group[]> {
    const rows = await db.select().from(groups)
    return rows.map((row) => this.buildGroup(row))
  }

  async update(id: string, data: Partial<Group>): Promise<void> {
    const rows = await db.select().from(groups).where(eq(groups.id, id)).limit(1)
    if (rows.length === 0) {
      throw new NotFoundError(`Group with id ${id}`)
    }

    const dbUpdate: Record<string, unknown> = {}
    if (data.name !== undefined) dbUpdate.name = data.name
    if (data.members !== undefined) dbUpdate.members = data.members
    if (data.avatar_url !== undefined) dbUpdate.avatarUrl = data.avatar_url
    if (data.allow_self_responses !== undefined) dbUpdate.allowSelfResponses = data.allow_self_responses
    if (data.activation_strategy !== undefined) dbUpdate.activationStrategy = data.activation_strategy
    if (data.generation_mode !== undefined) dbUpdate.generationMode = data.generation_mode
    if (data.disabled_members !== undefined) dbUpdate.disabledMembers = data.disabled_members
    if (data.fav !== undefined) dbUpdate.fav = data.fav
    if (data.chat_id !== undefined) dbUpdate.chatId = data.chat_id
    if (data.chats !== undefined) dbUpdate.chats = data.chats
    if (data.auto_mode_delay !== undefined) dbUpdate.autoModeDelay = data.auto_mode_delay
    if (data.generation_mode_join_prefix !== undefined) dbUpdate.genModeJoinPrefix = data.generation_mode_join_prefix
    if (data.generation_mode_join_suffix !== undefined) dbUpdate.genModeJoinSuffix = data.generation_mode_join_suffix
    if (data.chat_size !== undefined) dbUpdate.chatSize = data.chat_size

    await db.update(groups).set(dbUpdate).where(eq(groups.id, id))

    const filePath = this.groupPath(id)
    if (await exists(filePath)) {
      const current = JSON.parse(await readFile(filePath, "utf-8")) as Group
      await writeFile(filePath, JSON.stringify({ ...current, ...data }, null, 2))
    }
  }

  async delete(id: string): Promise<void> {
    const rows = await db.select().from(groups).where(eq(groups.id, id)).limit(1)
    if (rows.length === 0) {
      throw new NotFoundError(`Group with id ${id}`)
    }

    await removeFile(this.groupPath(id))
    await db.delete(groups).where(eq(groups.id, id))
  }

  async addMember(id: string, characterFileName: string): Promise<void> {
    const rows = await db.select().from(groups).where(eq(groups.id, id)).limit(1)
    if (rows.length === 0) {
      throw new NotFoundError(`Group with id ${id}`)
    }
    const row = rows[0]!
    if (row.members.includes(characterFileName)) {
      throw new ConflictError(`${characterFileName} is already a member of group ${id}`)
    }

    const newMembers = [...row.members, characterFileName]
    await db.update(groups).set({ members: newMembers }).where(eq(groups.id, id))

    const filePath = this.groupPath(id)
    if (await exists(filePath)) {
      const current = JSON.parse(await readFile(filePath, "utf-8")) as Group
      current.members = newMembers
      await writeFile(filePath, JSON.stringify(current, null, 2))
    }
  }

  async removeMember(id: string, characterFileName: string): Promise<void> {
    const rows = await db.select().from(groups).where(eq(groups.id, id)).limit(1)
    if (rows.length === 0) {
      throw new NotFoundError(`Group with id ${id}`)
    }
    const row = rows[0]!
    if (!row.members.includes(characterFileName)) {
      throw new NotFoundError(`${characterFileName} is not a member of group ${id}`)
    }

    const newMembers = row.members.filter((m: string) => m !== characterFileName)
    await db.update(groups).set({ members: newMembers }).where(eq(groups.id, id))

    const filePath = this.groupPath(id)
    if (await exists(filePath)) {
      const current = JSON.parse(await readFile(filePath, "utf-8")) as Group
      current.members = newMembers
      await writeFile(filePath, JSON.stringify(current, null, 2))
    }
  }

  async importGroup(data: GroupCreateInput & { id?: string }): Promise<Group> {
    const id = data.id ?? randomUUID()

    const existing = await db.select().from(groups).where(eq(groups.id, id)).limit(1)
    if (existing.length > 0) {
      throw new ConflictError(`Group with id ${id} already exists`)
    }

    const now = Date.now()
    const createDate = new Date(now).toISOString()

    const group: Group = {
      id,
      name: data.name,
      members: data.members,
      avatar_url: data.avatar_url,
      allow_self_responses: data.allow_self_responses ?? false,
      activation_strategy: data.activation_strategy ?? 0,
      generation_mode: data.generation_mode ?? 0,
      disabled_members: data.disabled_members ?? [],
      fav: false,
      chats: [],
      auto_mode_delay: 5,
      generation_mode_join_prefix: "",
      generation_mode_join_suffix: "",
      create_date: createDate,
      chat_size: 0,
    }

    await writeFile(this.groupPath(id), JSON.stringify(group, null, 2))

    await db.insert(groups).values({
      id,
      name: data.name,
      members: data.members,
      avatarUrl: data.avatar_url ?? "",
      allowSelfResponses: data.allow_self_responses ?? false,
      activationStrategy: data.activation_strategy ?? 0,
      generationMode: data.generation_mode ?? 0,
      disabledMembers: data.disabled_members ?? [],
      fav: false,
      chatId: "",
      chats: [],
      autoModeDelay: 5,
      genModeJoinPrefix: "",
      genModeJoinSuffix: "",
      dateAdded: now,
      createDate,
      dateLastChat: 0,
      chatSize: 0,
      userId: this.userId,
    })

    return group
  }

  async exportGroup(id: string): Promise<{ data: string; fileName: string }> {
    const group = await this.get(id)
    if (!group) {
      throw new NotFoundError(`Group with id ${id}`)
    }
    return { data: JSON.stringify(group, null, 2), fileName: `${id}.json` }
  }
}

export const groupService = new GroupService()
