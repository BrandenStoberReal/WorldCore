import type { z } from 'zod';
import {
  PresetCategorySchema,
  OpenaiPresetSchema,
  KoboldPresetSchema,
  TextGenPresetSchema,
  NovelPresetSchema,
  InstructTemplateSchema,
  ContextTemplateSchema,
  SyspromptSchema,
  ReasoningTemplateSchema,
  GenerationPresetSchema,
  PresetSchema,
} from '@/shared/schemas/preset';

export type PresetCategory = z.infer<typeof PresetCategorySchema>;
export type OpenaiPreset = z.infer<typeof OpenaiPresetSchema>;
export type KoboldPreset = z.infer<typeof KoboldPresetSchema>;
export type TextGenPreset = z.infer<typeof TextGenPresetSchema>;
export type NovelPreset = z.infer<typeof NovelPresetSchema>;
export type InstructTemplate = z.infer<typeof InstructTemplateSchema>;
export type ContextTemplate = z.infer<typeof ContextTemplateSchema>;
export type Sysprompt = z.infer<typeof SyspromptSchema>;
export type ReasoningTemplate = z.infer<typeof ReasoningTemplateSchema>;
export type GenerationPreset = z.infer<typeof GenerationPresetSchema>;
export type Preset = z.infer<typeof PresetSchema> & { isDefault?: boolean };
