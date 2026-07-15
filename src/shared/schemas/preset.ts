import { z } from 'zod';
import { SHARED_CONST } from '@/shared/constants';

export const PresetCategorySchema = z.enum([...SHARED_CONST.PRESET_CATEGORIES] as [
  string,
  ...string[],
]);

export const OpenaiPresetSchema = z
  .object({
    chat_completion_source: z.string().default('openai'),
    max_tokens: z.number().int().default(200),
    max_tokens_second: z.number().int().default(0),
    min_tokens_second: z.number().int().default(0),
    temperature: z.number().default(1),
    frequency_penalty: z.number().default(0),
    presence_penalty: z.number().default(0),
    top_p: z.number().default(1),
    top_k: z.number().int().default(0),
    openai_min_free_slots: z.number().int().default(0),
    seed: z.number().int().default(-1),
    stream_openai: z.boolean().default(true),
    wrap_in_quotes: z.boolean().default(false),
    names: z.array(z.string()).optional(),
    names_behavior: z.string().optional(),
    send_if_empty: z.string().default(''),
    prompt_order: z.array(z.string()).optional(),
    prompt_note: z.string().default(''),
    character_id: z.string().optional(),
  })
  .catchall(z.unknown());

export const KoboldPresetSchema = z
  .object({
    temp: z.number().default(1),
    top_p: z.number().default(1),
    top_k: z.number().int().default(0),
    tfs: z.number().default(1),
    rep_pen: z.number().default(1),
    rep_pen_range: z.number().int().default(0),
    rep_pen_slope: z.number().default(0),
    min_length: z.number().int().default(0),
    typical_p: z.number().default(1),
    max_tokens: z.number().int().default(200),
  })
  .catchall(z.unknown());

export const TextGenPresetSchema = z
  .object({
    temp: z.number().default(1),
    top_p: z.number().default(1),
    top_k: z.number().int().default(0),
    typical_p: z.number().default(1),
    epsilon_cutoff: z.number().default(0),
    eta_cutoff: z.number().default(0),
    rep_pen: z.number().default(1),
  })
  .catchall(z.unknown());

export const NovelPresetSchema = z
  .object({
    temperature: z.number().default(1),
    max_length: z.number().int().default(200),
    min_length: z.number().int().default(0),
    top_a: z.number().default(0),
    top_k: z.number().int().default(0),
  })
  .catchall(z.unknown());

export const InstructTemplateSchema = z
  .object({
    system_prompt: z.string().default(''),
    input_sequence: z.string().default(''),
    output_sequence: z.string().default(''),
    first_output_sequence: z.string().default(''),
    last_output_sequence: z.string().default(''),
    system_sequence: z.string().default(''),
    stop_sequence: z.string().default(''),
    separator_sequence: z.string().default(''),
    wrap: z.boolean().default(false),
  })
  .catchall(z.unknown());

export const ContextTemplateSchema = z
  .object({
    story_string: z.string().default(''),
    chat_start: z.string().default(''),
  })
  .catchall(z.unknown());

export const SyspromptSchema = z
  .object({
    name: z.string(),
    content: z.string(),
  })
  .catchall(z.unknown());

export const ReasoningTemplateSchema = z
  .object({
    name: z.string(),
  })
  .catchall(z.unknown());

export const PresetSchema = z.discriminatedUnion('category', [
  z.object({ category: z.literal('openai'), data: OpenaiPresetSchema }),
  z.object({ category: z.literal('kobold'), data: KoboldPresetSchema }),
  z.object({ category: z.literal('koboldhorde'), data: KoboldPresetSchema }),
  z.object({ category: z.literal('novel'), data: NovelPresetSchema }),
  z.object({ category: z.literal('textgenerationwebui'), data: TextGenPresetSchema }),
  z.object({ category: z.literal('instruct'), data: InstructTemplateSchema }),
  z.object({ category: z.literal('context'), data: ContextTemplateSchema }),
  z.object({ category: z.literal('sysprompt'), data: SyspromptSchema }),
  z.object({ category: z.literal('reasoning'), data: ReasoningTemplateSchema }),
]);
