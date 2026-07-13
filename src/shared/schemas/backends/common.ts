import { z } from "zod";

export const GenSettingsSchema = z.object({
  temperature: z.number().default(1),
  top_p: z.number().default(1),
  top_k: z.number().int().default(0),
  min_p: z.number().default(0),
  typical_p: z.number().default(1),
  epsilon_cutoff: z.number().default(0),
  eta_cutoff: z.number().default(0),
  rep_pen: z.number().default(1),
  rep_pen_range: z.number().int().default(0),
  rep_pen_decay: z.number().default(0),
  rep_pen_slope: z.number().default(0),
  top_a: z.number().default(0),
  tfs: z.number().default(1),
  top_b: z.number().default(0),
  sm_smoothing: z.number().default(0),
  dry_multiplier: z.number().default(0),
  dry_base: z.number().default(0),
  dry_allowed_length: z.number().int().default(0),
  dry_penalty_last_n: z.number().int().default(0),
  mimic_example: z.string().default(""),
  mimic_color: z.string().default(""),
});

export const GenParamsSchema = z.object({
  max_context: z.number().int(),
  max_length: z.number().int(),
});

export const GenResultSchema = z.object({
  result: z.string(),
  seed: z.number().int().optional(),
  tokens_generated: z.number().int().optional(),
  seconds_per_token: z.number().optional(),
  total_time: z.number().optional(),
  truncated: z.boolean().optional(),
  stops: z.array(z.string()).optional(),
});
