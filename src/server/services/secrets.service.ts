import { db } from "@/server/db/client"
import { secrets } from "@/server/db/schema"
import { eq } from "drizzle-orm"
import { writeFileAtomic, readFile, exists } from "@/server/storage/fs"
import path from "node:path"
import { USER_ROOT } from "@/server/storage/paths"
import type { SecretKey, SecretValue, SecretState, SecretStateMap } from "@/shared/types/secret"
import { EXPORTABLE_KEYS } from "@/shared/schemas/secret"
import { SHARED_CONST } from "@/shared/constants"

const SECRETS_FILE = path.join(USER_ROOT, "secrets.json")

export class SecretManager {
  async load(): Promise<Record<string, SecretValue | null>> {
    if (!(await exists(SECRETS_FILE))) {
      return {}
    }
    try {
      const content = await readFile(SECRETS_FILE, "utf-8")
      return JSON.parse(content) as Record<string, SecretValue | null>
    } catch {
      return {}
    }
  }

  private async save(data: Record<string, SecretValue | null>): Promise<void> {
    await writeFileAtomic(SECRETS_FILE, JSON.stringify(data, null, 2))
  }

  async write(key: SecretKey, value: string, label: string = ""): Promise<SecretValue> {
    const store = await this.load()
    const entry: SecretValue = {
      id: key,
      value,
      label: label || key,
      active: true,
    }

    store[key] = entry
    await this.save(store)

    await db.insert(secrets).values({
      key,
      value,
      label: entry.label,
      active: true,
      userId: "default-user",
    })

    return entry
  }

  async read(key: SecretKey): Promise<SecretValue | null> {
    const store = await this.load()
    const entry = store[key]
    if (!entry) return null
    return entry.active ? entry : null
  }

  async view(key: SecretKey): Promise<SecretState | null> {
    const entry = await this.read(key)
    if (!entry) return null
    return this.mask(entry, key)
  }

  async findAll(): Promise<SecretStateMap> {
    const store = await this.load()
    const result = {} as SecretStateMap
    for (const key of SHARED_CONST.SECRET_KEYS) {
      const entry = store[key]
      if (entry && entry.active) {
        result[key] = this.mask(entry, key)
      }
    }
    return result
  }

  async find(key: SecretKey): Promise<SecretState | null> {
    const entry = await this.read(key)
    if (!entry) return null
    return this.mask(entry, key)
  }

  async delete(key: SecretKey): Promise<boolean> {
    const store = await this.load()
    if (!(key in store)) return false

    delete store[key]
    await this.save(store)

    await db.delete(secrets).where(eq(secrets.key, key))
    return true
  }

  async rotate(key: SecretKey, newValue: string): Promise<SecretValue> {
    const store = await this.load()
    const current = store[key]
    const label = current?.label ?? key

    const entry: SecretValue = {
      id: key,
      value: newValue,
      label,
      active: true,
    }
    store[key] = entry
    await this.save(store)

    await db.insert(secrets).values({
      key,
      value: newValue,
      label,
      active: true,
      userId: "default-user",
    })

    return entry
  }

  async rename(key: SecretKey, newLabel: string): Promise<boolean> {
    const store = await this.load()
    const entry = store[key]
    if (!entry) return false

    entry.label = newLabel
    await this.save(store)
    return true
  }

  private mask(entry: SecretValue, key: SecretKey): SecretState {
    const isExportable = EXPORTABLE_KEYS.includes(key as typeof EXPORTABLE_KEYS[number])
    const value = isExportable ? entry.value : this.maskValue(entry.value)
    return {
      id: entry.id,
      value,
      label: entry.label,
      active: entry.active,
    }
  }

  private maskValue(value: string): string {
    if (value.length <= 8) return "\u2022".repeat(value.length)
    return value.slice(0, 4) + "\u2022".repeat(value.length - 4)
  }
}

export const secretManager = new SecretManager()
