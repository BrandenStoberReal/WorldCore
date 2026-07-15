import type { z } from 'zod';
import {
  TextCompletionSourceSchema,
  TextCompletionRequestSchema,
  TextCompletionResponseSchema,
} from '@/shared/schemas/backends/textcompletions';

export type TextCompletionSource = z.infer<typeof TextCompletionSourceSchema>;
export type TextCompletionRequest = z.infer<typeof TextCompletionRequestSchema>;
export type TextCompletionResponse = z.infer<typeof TextCompletionResponseSchema>;
