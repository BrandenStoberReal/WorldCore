import { z } from "zod";

export const TokenizerModelSchema = z.enum([
  "gpt2",
  "cl100k_base",
  "p50k_base",
  "p50k_edit",
  "r50k_base",
]);

export const TokenizeRequestSchema = z.object({
  model: TokenizerModelSchema,
  text: z.string(),
});

export const TokenizeResponseSchema = z.object({
  tokens: z.array(z.number().int()),
  text: z.string(),
  count: z.number().int(),
});
