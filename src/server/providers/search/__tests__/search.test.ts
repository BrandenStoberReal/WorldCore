import { describe, it, expect, mock } from 'bun:test';
import {
  SearchRequestSchema,
  SearchProviderSchema,
  SearchResponseSchema,
} from '@/shared/schemas/search';

describe('Search schemas', () => {
  it('validates all 7 providers', () => {
    const providers = ['serpapi', 'searxng', 'tavily', 'google', 'bing', 'duckduckgo', 'brave'];
    for (const p of providers) {
      const result = SearchProviderSchema.safeParse(p);
      expect(result.success).toBe(true);
    }
  });

  it('rejects unknown provider', () => {
    const result = SearchProviderSchema.safeParse('unknown');
    expect(result.success).toBe(false);
  });

  it('parses valid search request', () => {
    const result = SearchRequestSchema.safeParse({
      query: 'test query',
      provider: 'tavily',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider).toBe('tavily');
    }
  });

  it('defaults provider to searxng', () => {
    const result = SearchRequestSchema.safeParse({
      query: 'test query',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider).toBe('searxng');
    }
  });

  it('rejects request missing query', () => {
    const result = SearchRequestSchema.safeParse({
      provider: 'tavily',
    });
    expect(result.success).toBe(false);
  });

  it('validates search response', () => {
    const result = SearchResponseSchema.safeParse({
      results: [{ title: 'Test', link: 'https://example.com' }],
      provider: 'tavily',
      query: 'test query',
    });
    expect(result.success).toBe(true);
  });
});
