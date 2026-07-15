import type { z } from 'zod';
import {
  TTSProviderSchema,
  STTProviderSchema,
  TTSSynthesizeRequestSchema,
  TTSSynthesizeResponseSchema,
  STTTranscribeRequestSchema,
  STTTranscribeResponseSchema,
} from '@/shared/schemas/speech';

export type TTSProvider = z.infer<typeof TTSProviderSchema>;
export type STTProvider = z.infer<typeof STTProviderSchema>;
export type TTSSynthesizeRequest = z.infer<typeof TTSSynthesizeRequestSchema>;
export type TTSSynthesizeResponse = z.infer<typeof TTSSynthesizeResponseSchema>;
export type STTTranscribeRequest = z.infer<typeof STTTranscribeRequestSchema>;
export type STTTranscribeResponse = z.infer<typeof STTTranscribeResponseSchema>;
