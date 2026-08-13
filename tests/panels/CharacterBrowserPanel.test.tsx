import { describe, it, expect, beforeEach } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CharacterBrowserPanel } from '../../src/panels/CharacterBrowserPanel';
import { clearAllCardSources } from '../../src/lib/cardSourceRegistry';
import type { CardSource, CardListing } from '../../src/shared/types/character';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const testQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0 } },
});

function panelHtml(): string {
  return renderToStaticMarkup(
    <QueryClientProvider client={testQueryClient}>
      <CharacterBrowserPanel />
    </QueryClientProvider>,
  );
}

function createMockSource(id: string, cards: CardListing[]): CardSource {
  const PAGE_SIZE = 5;
  return {
    id,
    label: `Source ${id}`,
    description: `Mock source ${id}`,
    fetchCard: async () => new ArrayBuffer(0),
    browse: (opts?: { sort?: string; cursor?: string }) => {
      const start = opts?.cursor ? parseInt(opts.cursor, 10) : 0;
      const page = cards.slice(start, start + PAGE_SIZE);
      const nextCursor = start + PAGE_SIZE < cards.length ? String(start + PAGE_SIZE) : undefined;
      return { items: page, nextCursor };
    },
  };
}

function makeCard(cardId: string, name: string, creator?: string): CardListing {
  return {
    sourceId: 'test-source',
    cardId,
    name,
    creator,
    tags: [],
    avatarUrl: undefined,
  };
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
  });

  it('renders the search input with placeholder', () => {
    const html = panelHtml();
    expect(html).toContain('Search card sources…');
  });

  it('renders the BROWSE header label', () => {
    const html = panelHtml();
    expect(html).toContain('[BROWSE] · FORGE');
  });

  it('renders the Hide Installed toggle button', () => {
    const html = panelHtml();
    expect(html).toContain('Hide Installed');
  });

  it('Hide Installed button has correct default title', () => {
    const html = panelHtml();
    expect(html).toContain('title="Hide installed cards"');
  });
});
