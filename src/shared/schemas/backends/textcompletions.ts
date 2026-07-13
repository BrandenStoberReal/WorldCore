import { z } from "zod";
import { SHARED_CONST } from "@/shared/constants";

export const TextCompletionSourceSchema = z.enum([
  ...SHARED_CONST.TEXT_COMPLETION_SOURCES,
] as [string, ...string[]]);

export const TextCompletionRequestSchema = z
  .object({
    text_completion_source: TextCompletionSourceSchema,
    model: z.string(),
    prompt: z.string(),
    max_context: z.number().int().optional(),
    max_length: z.number().int().optional(),
    temperature: z.number().optional(),
    top_p: z.number().optional(),
    top_k: z.number().int().optional(),
    min_p: z.number().optional(),
    typical_p: z.number().optional(),
    rep_pen: z.number().optional(),
    rep_pen_range: z.number().int().optional(),
    tfs: z.number().optional(),
    top_a: z.number().optional(),
    epsilon_cutoff: z.number().optional(),
    eta_cutoff: z.number().optional(),
    stop: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .catchall(z.unknown());

export const TextCompletionResponseSchema = z.object({
  result: z.string(),
  seed: z.number().int().optional(),
  tokens_generated: z.number().int().optional(),
  seconds_per_token: z.number().optional(),
  total_time: z.number().optional(),
  truncated: z.boolean().optional(),
  stops: z.array(z.string()).optional(),
});
