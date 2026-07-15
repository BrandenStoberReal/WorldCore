import { z } from 'zod';
import {
  SearchProviderSchema,
  SearchRequestSchema,
  SearchResultSchema,
  SearchResponseSchema,
} from '@/shared/schemas/search';

export type SearchProvider = z.infer<typeof SearchProviderSchema>;
export type SearchRequest = z.infer<typeof SearchRequestSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
