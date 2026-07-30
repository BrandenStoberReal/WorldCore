import { z } from 'zod';
import { SHARED_CONST } from '@/shared/constants';

const AllSources = [
  ...SHARED_CONST.CHAT_COMPLETION_SOURCES,
  ...SHARED_CONST.TEXT_COMPLETION_SOURCES,
] as const;

export const ConnectionProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(255),

  api: z.enum(AllSources),
  model: z.string().trim().min(1).max(500),
  apiUrl: z.string().url().optional(),
  secretId: z.string().uuid().optional(),

  preset: z.string().trim().max(255).optional(),
  instruct: z.string().trim().max(255).optional(),
  context: z.string().trim().max(255).optional(),
  sysprompt: z.string().trim().max(255).optional(),
  syspromptState: z.boolean().optional(),
  instructState: z.boolean().optional(),

  stopStrings: z.string().max(2000).optional(),
  startReplyWith: z.string().max(500).optional(),
  reasoningTemplate: z.string().trim().max(255).optional(),
  promptPostProcessing: z.string().trim().max(255).optional(),

  tokenizer: z.string().trim().max(255).optional(),

  mode: z.enum(['chat', 'text']).optional(),

  proxy: z.string().trim().max(255).optional(),
  regexPreset: z.string().trim().max(255).optional(),
  exclude: z.array(z.string().trim().max(255)).optional(),

  isDefault: z.boolean().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type ConnectionProfile = z.infer<typeof ConnectionProfileSchema>;

export const ConnectionProfileCreateInputSchema = ConnectionProfileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ConnectionProfileCreateInput = z.infer<typeof ConnectionProfileCreateInputSchema>;

export const ConnectionProfileUpdateInputSchema = ConnectionProfileCreateInputSchema.partial();

export type ConnectionProfileUpdateInput = z.infer<typeof ConnectionProfileUpdateInputSchema>;
