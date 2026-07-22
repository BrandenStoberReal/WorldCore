import path from 'node:path';
import { existsSync } from 'node:fs';
import { db } from '@/server/db/client';
import { presets } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { paths } from '@/server/storage/paths';
import { listFiles, removeFile, writeFileAtomic, mkdir } from '@/server/storage/fs';
import type { Preset, PresetCategory } from '@/shared/types/preset';

const SEED_DATA_DIR = path.join(import.meta.dir, 'preset', 'seed-data');

const SEED_CATEGORIES: PresetCategory[] = [
  'instruct',
  'context',
  'sysprompt',
  'reasoning',
  'textgenerationwebui',
  'generation',
];

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
  generation: paths.generation,
};

const ALL_CATEGORIES: PresetCategory[] = [
  'openai',
  'kobold',
  'koboldhorde',
  'novel',
  'textgenerationwebui',
  'instruct',
  'context',
  'sysprompt',
  'reasoning',
  'generation',
];

export class PresetService {
  private userId = 'default-user';

  async getAll(category?: PresetCategory): Promise<Preset[]> {
    if (category) {
      return this.getByCategory(category);
    }
    const all: Preset[] = [];
    for (const cat of ALL_CATEGORIES) {
      all.push(...(await this.getByCategory(cat)));
    }
    return all;
  }

  async getByCategory(category: PresetCategory): Promise<Preset[]> {
    const dir = CATEGORY_DIR_MAP[category]!;
    const files = await listFiles(dir, '.json').catch(() => [] as string[]);
    const result: Preset[] = [];

    const dbRows = await db
      .select({ name: presets.name, isDefault: presets.isDefault })
      .from(presets)
      .where(eq(presets.category, category));
    const defaultFlags = new Map(dbRows.map((r) => [r.name, r.isDefault]));

    for (const file of files) {
      const filePath = path.join(dir, file);
      try {
        const content = await Bun.file(filePath).text();
        const data = JSON.parse(content) as Record<string, unknown>;
        const name = file.replace(/\.json$/, '');
        const isDefault = defaultFlags.get(name) ?? false;
        result.push({ category, data, isDefault } as Preset);
      } catch {}
    }

    return result;
  }

  async get(category: PresetCategory, name: string): Promise<Preset | null> {
    const dir = CATEGORY_DIR_MAP[category]!;
    const filePath = path.join(dir, `${name}.json`);
    try {
      const content = await Bun.file(filePath).text();
      const data = JSON.parse(content) as Record<string, unknown>;
      const dbRow = await db
        .select({ isDefault: presets.isDefault })
        .from(presets)
        .where(and(eq(presets.category, category), eq(presets.name, name)))
        .limit(1);
      const isDefault = dbRow[0]?.isDefault ?? false;
      return { category, data, isDefault } as Preset;
    } catch {
      return null;
    }
  }

  async save(preset: Preset): Promise<void> {
    const dir = CATEGORY_DIR_MAP[preset.category]!;
    const fileName = this.getFileName(preset);
    const filePath = path.join(dir, `${fileName}.json`);

    const existing = await db
      .select({ isDefault: presets.isDefault })
      .from(presets)
      .where(and(eq(presets.category, preset.category), eq(presets.name, fileName)))
      .limit(1);
    if (existing[0]?.isDefault) {
      throw new Error(`Cannot overwrite default preset "${fileName}"`);
    }

    await writeFileAtomic(filePath, JSON.stringify(preset.data, null, 2));

    await db
      .delete(presets)
      .where(and(eq(presets.category, preset.category), eq(presets.name, fileName)));
    await db.insert(presets).values({
      name: fileName,
      category: preset.category,
      data: preset.data as Record<string, unknown>,
      isDefault: false,
      userId: this.userId,
    });
  }

  async delete(category: PresetCategory, name: string): Promise<void> {
    const dir = CATEGORY_DIR_MAP[category]!;
    const filePath = path.join(dir, `${name}.json`);
    await removeFile(filePath);
    await db.delete(presets).where(and(eq(presets.category, category), eq(presets.name, name)));
  }

  async importPreset(preset: Preset): Promise<void> {
    await this.save(preset);
  }

  async exportPreset(
    category: PresetCategory,
    name: string,
  ): Promise<{ data: Buffer; fileName: string } | null> {
    const preset = await this.get(category, name);
    if (!preset) return null;
    return {
      data: Buffer.from(JSON.stringify(preset.data, null, 2)),
      fileName: `${name}.json`,
    };
  }

  private getFileName(preset: Preset): string {
    const data = preset.data as Record<string, unknown>;
    return (data.name as string) || 'unnamed';
  }

  async seedDefaults(): Promise<void> {
    for (const category of SEED_CATEGORIES) {
      const targetDir = CATEGORY_DIR_MAP[category]!;
      await mkdir(targetDir, { recursive: true });

      const seedDir = path.join(SEED_DATA_DIR, category);
      if (!existsSync(seedDir)) continue;

      const files = await listFiles(seedDir, '.json').catch(() => [] as string[]);

      for (const file of files) {
        const targetPath = path.join(targetDir, file);
        const name = file.replace(/\.json$/, '');

        if (!existsSync(targetPath)) {
          const seedPath = path.join(seedDir, file);
          try {
            const content = await Bun.file(seedPath).text();
            await writeFileAtomic(targetPath, content);
          } catch {}
        }

        try {
          const content = await Bun.file(targetPath).text();
          const data = JSON.parse(content) as Record<string, unknown>;
          if (!data.name) {
            data.name = name;
            await writeFileAtomic(targetPath, JSON.stringify(data, null, 2));
          }
        } catch {}

        const existing = await db
          .select({ isDefault: presets.isDefault })
          .from(presets)
          .where(and(eq(presets.category, category), eq(presets.name, name)))
          .limit(1);
        if (!existing[0]) {
          const content = await Bun.file(targetPath).text();
          const data = JSON.parse(content) as Record<string, unknown>;
          await db.insert(presets).values({
            name,
            category,
            data,
            isDefault: true,
            userId: this.userId,
          });
        } else if (!existing[0].isDefault) {
          await db
            .update(presets)
            .set({ isDefault: true })
            .where(and(eq(presets.category, category), eq(presets.name, name)));
        }
      }
    }
  }
}

export const presetService = new PresetService();
