import { z } from "zod";

export const ActivationStrategySchema = z.enum(["0", "1", "2", "3", "4"]).transform(Number);
export const GenerationModeSchema = z.enum(["0", "1", "2", "3"]).transform(Number);

export const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  members: z.array(z.string()),
  avatar_url: z.string().optional(),
  allow_self_responses: z.boolean().default(false),
  activation_strategy: z.number().int().default(0),
  generation_mode: z.number().int().default(0),
  disabled_members: z.array(z.string()).default([]),
  fav: z.boolean().default(false),
  chat_id: z.string().optional(),
  chats: z.array(z.string()).default([]),
  auto_mode_delay: z.number().int().default(0),
  generation_mode_join_prefix: z.string().default(""),
  generation_mode_join_suffix: z.string().default(""),
  date_added: z.string().datetime().optional(),
  create_date: z.string().datetime().optional(),
  date_last_chat: z.string().datetime().optional(),
  chat_size: z.number().int().default(0),
});

export const GroupCreateInputSchema = z.object({
  name: z.string(),
  members: z.array(z.string()),
  avatar_url: z.string().optional(),
  allow_self_responses: z.boolean().default(false),
  activation_strategy: z.number().int().default(0),
  generation_mode: z.number().int().default(0),
  disabled_members: z.array(z.string()).default([]),
});
