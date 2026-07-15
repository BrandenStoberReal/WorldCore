import { z } from 'zod';

export const SSEChunkSchema = z.union([
  z.object({
    choices: z.array(
      z.object({
        delta: z.object({
          content: z.string().optional(),
          role: z.string().optional(),
        }),
        index: z.number().optional(),
        finish_reason: z.string().optional().nullable(),
      }),
    ),
  }),
  z.object({
    choices: z.array(
      z.object({
        text: z.string(),
        index: z.number().optional(),
        finish_reason: z.string().optional().nullable(),
      }),
    ),
  }),
]);

export const SSEDoneChunkSchema = z.literal('[DONE]');
