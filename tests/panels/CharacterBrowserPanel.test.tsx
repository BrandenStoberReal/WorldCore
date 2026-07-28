import { describe, it, expect, beforeEach } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CharacterBrowserPanel } from '../../src/panels/CharacterBrowserPanel';
import { clearAllCardSources } from '../../src/lib/cardSourceRegistry';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const testQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function panelHtml(): string {
  return renderToStaticMarkup(
    <QueryClientProvider client={testQueryClient}>
      <CharacterBrowserPanel />
    </QueryClientProvider>,
  );
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('CharacterBrowserPanel smoke', () => {
  beforeEach(() => {
    clearAllCardSources();
  });

  it('renders without throwing when registry is empty', () => {
    const html = panelHtml();
    expect(html).toContain('data-panel="character-browser"');
  });

  it('renders the "no sources" empty state when no sources registered', () => {
    const html = panelHtml();
    expect(html).toContain('No card sources registered');
    expect(html).toContain(
      'Install an extension that provides card sources to browse characters from external libraries.',
    );
  });

  it('renders the search input with placeholder', () => {
    const html = panelHtml();
    expect(html).toContain('Search card sources…');
  });

  it('renders the BROWSE header label', () => {
    const html = panelHtml();
    expect(html).toContain('[BROWSE] · FORGE');
  });
});
