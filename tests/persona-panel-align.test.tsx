import { describe, it, expect } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonaPanel } from '../src/panels/persona/PersonaPanel';

const testQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function panelHtml(): string {
  return renderToStaticMarkup(
    <QueryClientProvider client={testQueryClient}>
      <PersonaPanel />
    </QueryClientProvider>,
  );
}

describe('PersonaPanel alignment', () => {
  it('wrapper does not use mx-auto (left-aligns inside drawer)', () => {
    const html = panelHtml();
    // Extract the wrapper className to assert on tokens (order-insensitive).
    const match = html.match(/<div[^>]*class="([^"]*\bmax-w-6xl\b[^"]*)"/);
    expect(match).not.toBeNull();
    const wrapperClass = match![1];
    expect(wrapperClass).toContain('max-w-6xl');
    expect(wrapperClass).not.toMatch(/\bmx-auto\b/);
  });
});
