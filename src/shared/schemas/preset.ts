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
    temperature_last: z.boolean().default(true),
    top_p: z.number().default(1),
    top_k: z.number().int().default(0),
    top_a: z.number().default(0),
    tfs: z.number().default(1),
    epsilon_cutoff: z.number().default(0),
    eta_cutoff: z.number().default(0),
    typical_p: z.number().default(1),
    min_p: z.number().default(0),
    rep_pen: z.number().default(1),
    rep_pen_range: z.number().int().default(0),
    rep_pen_decay: z.number().default(0),
    rep_pen_slope: z.number().default(1),
    no_repeat_ngram_size: z.number().int().default(0),
    penalty_alpha: z.number().default(0),
    num_beams: z.number().int().default(1),
    length_penalty: z.number().default(1),
    min_length: z.number().int().default(0),
    encoder_rep_pen: z.number().default(1),
    freq_pen: z.number().default(0),
    presence_pen: z.number().default(0),
    skew: z.number().default(0),
    do_sample: z.boolean().default(true),
    early_stopping: z.boolean().default(false),
    dynatemp: z.boolean().default(false),
    min_temp: z.number().default(0),
    max_temp: z.number().default(2),
    dynatemp_exponent: z.number().default(1),
    smoothing_factor: z.number().default(0),
    smoothing_curve: z.number().default(1),
    dry_allowed_length: z.number().int().default(2),
    dry_multiplier: z.number().default(0),
    dry_base: z.number().default(1.75),
    dry_sequence_breakers: z.string().default(''),
    dry_penalty_last_n: z.number().int().default(0),
    add_bos_token: z.boolean().default(true),
    ban_eos_token: z.boolean().default(false),
    skip_special_tokens: z.boolean().default(true),
    ignore_eos_token: z.boolean().default(false),
    spaces_between_special_tokens: z.boolean().default(true),
    speculative_ngram: z.boolean().default(false),
    mirostat_mode: z.number().int().default(0),
    mirostat_tau: z.number().default(5),
    mirostat_eta: z.number().default(0.1),
    guidance_scale: z.number().default(1),
    negative_prompt: z.string().default(''),
    grammar_string: z.string().default(''),
    banned_tokens: z.string().default(''),
    logit_bias: z.array(z.number()).default([]),
    xtc_threshold: z.number().default(0),
    xtc_probability: z.number().default(0),
    nsigma: z.number().default(0),
    min_keep: z.number().int().default(0),
    rep_pen_size: z.number().int().default(0),
    sampler_priority: z.array(z.string()).optional(),
    samplers: z.array(z.string()).optional(),
    sampler_order: z.array(z.number()).optional(),
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
    name: z.string().default(''),
    system_prompt: z.string().default(''),
    input_sequence: z.string().default(''),
    output_sequence: z.string().default(''),
    first_output_sequence: z.string().default(''),
    last_output_sequence: z.string().default(''),
    system_sequence: z.string().default(''),
    last_system_sequence: z.string().default(''),
    first_input_sequence: z.string().default(''),
    last_input_sequence: z.string().default(''),
    stop_sequence: z.string().default(''),
    separator_sequence: z.string().default(''),
    output_suffix: z.string().default(''),
    input_suffix: z.string().default(''),
    system_suffix: z.string().default(''),
    system_sequence_prefix: z.string().default(''),
    system_sequence_suffix: z.string().default(''),
    story_string_prefix: z.string().default(''),
    story_string_suffix: z.string().default(''),
    user_alignment_message: z.string().default(''),
    activation_regex: z.string().default(''),
    names_behavior: z.string().default('force'),
    names: z.boolean().optional(),
    names_force_groups: z.boolean().optional(),
    wrap: z.boolean().default(false),
    macro: z.boolean().default(true),
    skip_examples: z.boolean().default(false),
    system_same_as_user: z.boolean().default(false),
    sequences_as_stop_strings: z.boolean().default(true),
  })
  .catchall(z.unknown());

export const ContextTemplateSchema = z
  .object({
    name: z.string().default(''),
    story_string: z.string().default(''),
    example_separator: z.string().default(''),
    chat_start: z.string().default(''),
    use_stop_strings: z.boolean().default(false),
    names_as_stop_strings: z.boolean().default(true),
    always_force_name2: z.boolean().default(true),
    trim_sentences: z.boolean().default(false),
    include_newline: z.boolean().default(false),
    single_line: z.boolean().default(false),
    story_string_position: z.number().int().default(0),
    story_string_depth: z.number().int().default(1),
    story_string_role: z.number().int().default(0),
  })
  .catchall(z.unknown());

export const SyspromptSchema = z
  .object({
    name: z.string(),
    content: z.string(),
    post_history: z.string().default(''),
  })
  .catchall(z.unknown());

export const ReasoningTemplateSchema = z
  .object({
    name: z.string(),
    prefix: z.string().default(''),
    suffix: z.string().default(''),
    separator: z.string().default(''),
  })
  .catchall(z.unknown());

export const GenerationPresetSchema = z
  .object({
    name: z.string(),
    temperature: z.number().default(1),
    top_p: z.number().default(1),
    top_k: z.number().int().default(50),
    max_tokens: z.number().int().default(4096),
    seed: z.number().int().default(-1),
    streaming: z.boolean().default(true),
    stop: z.array(z.string()).default([]),
    frequency_penalty: z.number().default(0),
    presence_penalty: z.number().default(0),
    min_tokens: z.number().int().default(0),
    min_p: z.number().default(0),
    typical_p: z.number().default(1),
    top_a: z.number().default(0),
    tfs: z.number().default(1),
    rep_pen: z.number().default(1),
    rep_pen_range: z.number().int().default(0),
    rep_pen_slope: z.number().default(0),
    dry_multiplier: z.number().default(0),
    dry_base: z.number().default(1.75),
    dry_allowed_length: z.number().int().default(0),
    mirostat_mode: z.number().int().default(0),
    mirostat_tau: z.number().default(5),
    mirostat_eta: z.number().default(0.1),
    smoothing_factor: z.number().default(0),
    epsilon_cutoff: z.number().default(0),
    eta_cutoff: z.number().default(0),
    model: z.string().default(''),
    mode: z.enum(['chat', 'text']).default('chat'),
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
  z.object({ category: z.literal('generation'), data: GenerationPresetSchema }),
]);
