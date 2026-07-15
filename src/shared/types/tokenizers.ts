import type { z } from 'zod';
import {
  TokenizerModelSchema,
  TokenizeRequestSchema,
  TokenizeResponseSchema,
} from '@/shared/schemas/tokenizers';

export type TokenizerModel = z.infer<typeof TokenizerModelSchema>;
export type TokenizeRequest = z.infer<typeof TokenizeRequestSchema>;
export type TokenizeResponse = z.infer<typeof TokenizeResponseSchema>;
