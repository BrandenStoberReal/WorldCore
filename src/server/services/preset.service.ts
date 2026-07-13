import path from "node:path"
import { db } from "@/server/db/client"
import { presets } from "@/server/db/schema"
import { eq, and } from "drizzle-orm"
import { paths } from "@/server/storage/paths"
import { listFiles, removeFile, writeFileAtomic } from "@/server/storage/fs"
import type { Preset, PresetCategory } from "@/shared/types/preset"

const CATEGORY_DIR_MAP: Record<PresetCategory, string> = {
  openai: paths.openAISettings,
  kobold: paths.koboldAISettings,
  koboldhorde: paths.koboldAISettings,
  novel: paths.novelAISettings,
  textgenerationwebui: paths.textGenSettings,
  instruct: paths.instruct,
  context: paths.context,
  sysprompt: paths.sysprompt,
  reasoning: paths.reasoning,
}

const ALL_CATEGORIES: PresetCategory[] = [
  "openai",
  "kobold",
  "koboldhorde",
  "novel",
  "textgenerationwebui",
  "instruct",
  "context",
  "sysprompt",
  "reasoning",
]

export class PresetService {
  private userId = "default-user"

  async getAll(category?: PresetCategory): Promise<Preset[]> {
    if (category) {
      return this.getByCategory(category)
    }
    const all: Preset[] = []
    for (const cat of ALL_CATEGORIES) {
      all.push(...(await this.getByCategory(cat)))
    }
    return all
  }

  async getByCategory(category: PresetCategory): Promise<Preset[]> {
    const dir = CATEGORY_DIR_MAP[category]!
    const files = await listFiles(dir, ".json").catch(() => [] as string[])
    const result: Preset[] = []

    for (const file of files) {
      const filePath = path.join(dir, file)
      try {
        const content = await Bun.file(filePath).text()
        const data = JSON.parse(content) as Record<string, unknown>
        result.push({ category, data } as Preset)
      } catch {
        // Skip invalid files
      }
    }

    return result
  }

  async get(category: PresetCategory, name: string): Promise<Preset | null> {
    const dir = CATEGORY_DIR_MAP[category]!
    const filePath = path.join(dir, `${name}.json`)
    try {
      const content = await Bun.file(filePath).text()
      const data = JSON.parse(content) as Record<string, unknown>
      return { category, data } as Preset
    } catch {
      return null
    }
  }

  async save(preset: Preset): Promise<void> {
    const dir = CATEGORY_DIR_MAP[preset.category]!
    const fileName = this.getFileName(preset)
    const filePath = path.join(dir, `${fileName}.json`)
    await writeFileAtomic(filePath, JSON.stringify(preset.data, null, 2))

    await db
      .delete(presets)
      .where(
        and(eq(presets.category, preset.category), eq(presets.name, fileName)),
      )
    await db.insert(presets).values({
      name: fileName,
      category: preset.category,
      data: preset.data as Record<string, unknown>,
      userId: this.userId,
    })
  }

  async delete(category: PresetCategory, name: string): Promise<void> {
    const dir = CATEGORY_DIR_MAP[category]!
    const filePath = path.join(dir, `${name}.json`)
    await removeFile(filePath)
    await db
      .delete(presets)
      .where(and(eq(presets.category, category), eq(presets.name, name)))
  }

  async importPreset(preset: Preset): Promise<void> {
    await this.save(preset)
  }

  async exportPreset(
    category: PresetCategory,
    name: string,
  ): Promise<{ data: Buffer; fileName: string } | null> {
    const preset = await this.get(category, name)
    if (!preset) return null
    return {
      data: Buffer.from(JSON.stringify(preset.data, null, 2)),
      fileName: `${name}.json`,
    }
  }

  private getFileName(preset: Preset): string {
    const data = preset.data as Record<string, unknown>
    return (data.name as string) || "unnamed"
  }
}

export const presetService = new PresetService()
