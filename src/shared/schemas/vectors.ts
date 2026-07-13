import { z } from "zod";

export const VectorSearchRequestSchema = z.object({
  query: z.string(),
  top_k: z.number().int().optional().default(5),
  threshold: z.number().optional().default(0.7),
  namespace: z.string().optional(),
  collection: z.string().optional(),
});

export const VectorEmbeddingRequestSchema = z.object({
  texts: z.array(z.string()),
  model: z.string().optional().default("default"),
});

export const VectorEmbeddingResponseSchema = z.object({
  embeddings: z.array(z.array(z.number())),
  model: z.string(),
});

export const VectorDeleteRequestSchema = z.object({
  ids: z.array(z.string()),
  namespace: z.string().optional(),
  collection: z.string().optional(),
});

export const VectorUpsertRequestSchema = z.object({
  vectors: z.array(z.object({
    id: z.string(),
    values: z.array(z.number()),
    metadata: z.record(z.unknown()).optional(),
  })),
  namespace: z.string().optional(),
  collection: z.string().optional(),
});
