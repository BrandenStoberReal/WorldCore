import type { z } from 'zod';
import {
  VectorSearchRequestSchema,
  VectorEmbeddingRequestSchema,
  VectorEmbeddingResponseSchema,
  VectorDeleteRequestSchema,
  VectorUpsertRequestSchema,
} from '@/shared/schemas/vectors';

export type VectorSearchRequest = z.infer<typeof VectorSearchRequestSchema>;
export type VectorEmbeddingRequest = z.infer<typeof VectorEmbeddingRequestSchema>;
export type VectorEmbeddingResponse = z.infer<typeof VectorEmbeddingResponseSchema>;
export type VectorDeleteRequest = z.infer<typeof VectorDeleteRequestSchema>;
export type VectorUpsertRequest = z.infer<typeof VectorUpsertRequestSchema>;
