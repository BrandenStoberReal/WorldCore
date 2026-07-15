import { z } from 'zod';

export const SearchProviderSchema = z.enum([
  'serpapi',
  'searxng',
  'tavily',
  'google',
  'bing',
  'duckduckgo',
  'brave',
]);

export const SearchRequestSchema = z.object({
  query: z.string(),
  provider: SearchProviderSchema.optional().default('searxng'),
});

export const SearchResultSchema = z.record(z.string(), z.unknown());

export const SearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  provider: z.string(),
  query: z.string(),
});
