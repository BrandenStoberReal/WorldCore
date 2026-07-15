import type { z } from 'zod';
import { SSEChunkSchema, SSEDoneChunkSchema } from '@/shared/schemas/streaming';

export type SSEChunk = z.infer<typeof SSEChunkSchema>;
export type SSEDoneChunk = z.infer<typeof SSEDoneChunkSchema>;
