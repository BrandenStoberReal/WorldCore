import { z } from 'zod';

export const CharacterSpecVersionSchema = z.enum(['1.0', '2.0', '3.0']);
export const CharacterSpecSchema = z.enum(['chara_card_v1', 'chara_card_v2', 'chara_card_v3']);
export const RoleSchema = z.enum(['system', 'user', 'assistant']);

export const DepthPromptSchema = z.object({
  prompt: z.string(),
  depth: z.number().default(4),
  role: RoleSchema.default('system'),
});

export const CharacterExtensionsSchema = z
  .object({
    talkativeness: z.number().default(0.5),
    fav: z.boolean().default(false),
    world: z.string().default(''),
    depth_prompt: DepthPromptSchema.optional(),
    avatar_style: z.number().default(0),
  })
  .catchall(z.unknown());

export const CharacterAssetSchema = z.object({
  type: z.string().default(''),
  uri: z.string().default(''),
  name: z.string().default(''),
  ext: z.string().default(''),
});

export const CharacterBookEntrySchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string().default(''),
  keys: z.array(z.string()).default([]),
  secondary_keys: z.array(z.string()).default([]),
  comment: z.string().default(''),
  content: z.string().default(''),
  constant: z.boolean().default(false),
  selective: z.boolean().default(false),
  insertion_order: z.number().default(0),
  priority: z.number().default(10),
  enabled: z.boolean().default(true),
  case_sensitive: z.boolean().default(false),
  position: z
    .union([
      z.literal('before_char'),
      z.literal('after_char'),
      z.literal("at_end as an author's note"),
      z.literal('in-chat'),
      z.number(),
    ])
    .default(0),
  use_regex: z.boolean().default(false),
  extensions: z.record(z.unknown()).optional(),
});

export const CharacterBookSchema = z.object({
  name: z.string().default(''),
  description: z.string().default(''),
  scan_depth: z.number().optional(),
  token_budget: z.number().optional(),
  recursive_scanning: z.boolean().default(false),
  entries: z.array(CharacterBookEntrySchema).default([]),
  extensions: z.record(z.unknown()).optional(),
});

export const CharacterDataSchema = z.object({
  name: z.string(),
  description: z.string().default(''),
  personality: z.string().default(''),
  scenario: z.string().default(''),
  first_mes: z.string().default(''),
  mes_example: z.string().default(''),
  creator_notes: z.string().default(''),
  system_prompt: z.string().default(''),
  post_history_instructions: z.string().default(''),
  tags: z.array(z.string()).default([]),
  creator: z.string().default(''),
  character_version: z.string().default(''),
  alternate_greetings: z.array(z.string()).default([]),
  character_book: CharacterBookSchema.optional(),
  extensions: z.record(z.unknown()).optional(),
  nickname: z.string().optional(),
  creator_notes_multilingual: z.record(z.string()).optional(),
  source: z.array(z.string()).default([]),
  group_only_greetings: z.array(z.string()).default([]),
  assets: z.array(CharacterAssetSchema).default([]),
  creation_date: z.number().optional(),
  modification_date: z.number().optional(),
});

export const CharacterSchema = z.object({
  avatar: z.string(),
  chat: z.string(),
  create_date: z.string().datetime().optional(),
  date_added: z.string().datetime().optional(),
  date_last_chat: z.string().datetime().optional(),
  chat_size: z.number().default(0),
  data_size: z.number().default(0),
  json_data: z.unknown().optional(),
  boundPersonaId: z.number().nullable().optional(),
  ...CharacterDataSchema.shape,
});

export const ShallowCharacterSchema = z.object({
  id: z.number(),
  shallow: z.literal(true),
  avatar: z.string(),
  chat: z.string(),
  create_date: z.string().datetime().optional(),
  date_added: z.string().datetime().optional(),
  date_last_chat: z.string().datetime().optional(),
  chat_size: z.number().default(0),
  data_size: z.number().default(0),
  name: z.string(),
  description: z.string().default(''),
  tags: z.array(z.string()).default([]),
  creator: z.string().default(''),
  character_version: z.string().default(''),
});

export const CharacterCreateInputSchema = z.object({
  name: z.string(),
  description: z.string().default(''),
  personality: z.string().default(''),
  scenario: z.string().default(''),
  first_mes: z.string().default(''),
  mes_example: z.string().default(''),
  creator_notes: z.string().default(''),
  system_prompt: z.string().default(''),
  post_history_instructions: z.string().default(''),
  tags: z.array(z.string()).default([]),
  creator: z.string().default(''),
  character_version: z.string().default(''),
  alternate_greetings: z.array(z.string()).default([]),
  character_book: CharacterBookSchema.optional(),
  extensions: z.record(z.unknown()).optional(),
  spec: CharacterSpecSchema.optional(),
  spec_version: CharacterSpecVersionSchema.optional(),
  avatar: z.string().optional(),
  nickname: z.string().optional(),
  creator_notes_multilingual: z.record(z.string()).optional(),
  source: z.array(z.string()).default([]),
  group_only_greetings: z.array(z.string()).default([]),
  assets: z.array(CharacterAssetSchema).default([]),
  creation_date: z.number().optional(),
  modification_date: z.number().optional(),
});

export const CharacterEditAttributeInputSchema = z.object({
  attribute: z.enum([
    'name',
    'description',
    'personality',
    'scenario',
    'first_mes',
    'mes_example',
    'creator_notes',
    'system_prompt',
    'post_history_instructions',
    'tags',
    'creator',
    'character_version',
    'alternate_greetings',
    'character_book',
    'extensions',
    'nickname',
    'creator_notes_multilingual',
    'source',
    'group_only_greetings',
    'assets',
    'creation_date',
    'modification_date',
  ]),
  value: z.unknown(),
});

export const CropSchema = z.object({
  width: z.number(),
  height: z.number(),
  x: z.number(),
  y: z.number(),
});
