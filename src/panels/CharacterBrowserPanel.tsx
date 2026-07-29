import { useState, useEffect, useRef, useMemo, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Download, Check, AlertCircle, Loader2, Compass, X } from 'lucide-react';
import { toastSuccess, toastError } from '@/lib/toast';
import { emit } from '@/lib/extensionEventBus';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { getAllCardSources, getCardSource, subscribeCardSources } from '@/lib/cardSourceRegistry';
import type {
  CardSource,
  CardListing,
  CardSearchResult,
  ShallowCharacter,
} from '@/shared/types/character';

/* ────────────────────────────────────────────────
   useSyncExternalStore – snapshot stability
   ──────────────────────────────────────────────── */

const emptySources: CardSource[] = [];
let _cachedSources: CardSource[] = emptySources;

function getSourcesSnapshot(): CardSource[] {
  const sources = getAllCardSources();
  if (sources.length === 0) {
    _cachedSources = emptySources;
    return emptySources;
  }
  if (sources.length === _cachedSources.length) {
    let same = true;
    for (let i = 0; i < sources.length; i++) {
      if (sources[i] !== _cachedSources[i]) {
        same = false;
        break;
      }
    }
    if (same) return _cachedSources;
  }
  _cachedSources = Object.freeze([...sources]) as CardSource[];
  return _cachedSources;
}

/* ────────────────────────────────────────────────
   Normalize CardSearchResult → CardListing[]
   ──────────────────────────────────────────────── */

async function normalizeResult(result: CardSearchResult): Promise<CardListing[]> {
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object' && 'items' in result) {
    return (result as { items: CardListing[] }).items;
  }
  const items: CardListing[] = [];
  for await (const item of result as AsyncIterable<CardListing>) {
    items.push(item);
  }
  return items;
}

/* ────────────────────────────────────────────────
   Dedup key helper
   ──────────────────────────────────────────────── */

function dedupKey(name: string, creator?: string): string {
  return `${name.toLowerCase()}\u0000${creator || ''}`;
}

/* ────────────────────────────────────────────────
   Source chip colour palette
   ──────────────────────────────────────────────── */

const CHIP_COLORS = [
  'border-amber-500/30 bg-amber-500/20 text-amber-400',
  'border-sky-500/30 bg-sky-500/20 text-sky-400',
  'border-emerald-500/30 bg-emerald-500/20 text-emerald-400',
  'border-violet-500/30 bg-violet-500/20 text-violet-400',
  'border-rose-500/30 bg-rose-500/20 text-rose-400',
  'border-cyan-500/30 bg-cyan-500/20 text-cyan-400',
  'border-orange-500/30 bg-orange-500/20 text-orange-400',
  'border-pink-500/30 bg-pink-500/20 text-pink-400',
];

function chipColor(index: number): string {
  const len = CHIP_COLORS.length;
  return CHIP_COLORS[((index % len) + len) % len]!;
}

/* ════════════════════════════════════════════════
   CharacterBrowserPanel
   ════════════════════════════════════════════════ */

export function CharacterBrowserPanel() {
  const queryClient = useQueryClient();

  /* ── registry (external store) ── */
  const sources = useSyncExternalStore(
    subscribeCardSources,
    getSourcesSnapshot,
    () => emptySources,
  );

  /* ── local state ── */
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeSourceIds, setActiveSourceIds] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<CardListing[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [downloadState, setDownloadState] = useState<
    Map<string, 'idle' | 'downloading' | 'done' | 'error'>
  >(new Map());

  const downloadChainRef = useRef(Promise.resolve());

  /* ── dedup: installed characters (shallow) ── */
  const { data: installedChars } = useQuery<ShallowCharacter[]>({
    queryKey: ['/api/v1/characters/all', 'browser-dedup'],
    queryFn: () =>
      fetch('/api/v1/characters/all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shallow: true }),
      }).then((r) => {
        if (!r.ok) throw new Error(`Failed to load characters: ${r.status}`);
        return r.json();
      }) as Promise<ShallowCharacter[]>,
  });

  const dedupKeys = useMemo(
    () => new Set(installedChars?.map((c) => dedupKey(c.name, c.creator)) ?? []),
    [installedChars],
  );

  /* ── debounce effect (200 ms) ── */
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  /* ── search effect ── */
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let stale = false;
    setIsSearching(true);

    const activeSources = sources.filter(
      (s) => (activeSourceIds.size === 0 || activeSourceIds.has(s.id)) && s.search,
    );

    if (activeSources.length === 0) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    Promise.all(
      activeSources.map(async (source) => {
        try {
          const result = await source.search!(debouncedQuery.trim());
          return { sourceId: source.id, items: await normalizeResult(result) };
        } catch (err) {
          console.error(`[browser] search error from "${source.id}":`, err);
          return { sourceId: source.id, items: [] as CardListing[] };
        }
      }),
    ).then((sourceResults) => {
      if (stale) return;
      const merged = new Map<string, CardListing>();
      for (const { sourceId, items } of sourceResults) {
        for (const item of items) {
          merged.set(`${sourceId}::${item.cardId}`, item);
        }
      }
      setResults([...merged.values()]);
      setIsSearching(false);
    });

    return () => {
      stale = true;
    };
  }, [debouncedQuery, activeSourceIds, sources]);

  /* ── download (serialised) ── */
  async function downloadSingle(listing: CardListing): Promise<void> {
    const key = `${listing.sourceId}::${listing.cardId}`;
    setDownloadState((prev) => new Map(prev).set(key, 'downloading'));
    try {
      const source = getCardSource(listing.sourceId);
      if (!source) throw new Error('Source not found');
      const bytes = await source.fetchCard(listing);
      const file = new File([bytes], `${listing.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`, {
        type: 'image/png',
      });
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/v1/characters/import', { method: 'POST', body: fd });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Import failed (${res.status}): ${text}`);
      }
      const body = (await res.json()) as { ok: boolean; id: number };
      queryClient.invalidateQueries({ queryKey: ['/api/v1/characters/all'] });
      emit('character_import', { id: body.id, name: listing.name });
      toastSuccess('Character imported', listing.name);
      setDownloadState((prev) => new Map(prev).set(key, 'done'));
    } catch (err) {
      setDownloadState((prev) => new Map(prev).set(key, 'error'));
      toastError(err);
    }
  }

  function handleDownload(listing: CardListing) {
    downloadChainRef.current = downloadChainRef.current.then(() => downloadSingle(listing));
  }

  /* ── source chip toggle ── */
  function toggleSource(sourceId: string) {
    setActiveSourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  }

  /* ── derived ── */
  const hasQuery = debouncedQuery.trim().length > 0;
  const noSources = sources.length === 0;
  const allInLibrary =
    results.length > 0 && results.every((r) => dedupKeys.has(dedupKey(r.name, r.creator)));

  function cardState(listing: CardListing): 'idle' | 'downloading' | 'done' | 'error' {
    const key = `${listing.sourceId}::${listing.cardId}`;
    const explicit = downloadState.get(key);
    if (explicit) return explicit;
    if (dedupKeys.has(dedupKey(listing.name, listing.creator))) return 'done';
    return 'idle';
  }

  /* ────────────────────────────────────────────
     Render
     ──────────────────────────────────────────── */

  return (
    <div
      data-panel="character-browser"
      className="bg-background flex h-full w-full flex-1 flex-col overflow-hidden"
    >
      {/* ── Top bar ── */}
      <header className={cn('border-border/40 flex items-center gap-3 border-b px-4 py-2')}>
        <span className="mono-tag text-ember">[BROWSE] · FORGE</span>
        <span className="bg-border/50 h-px w-6" />
        <div className="relative flex-1">
          <Search className="text-muted-foreground/55 pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search card sources…"
            className="h-8 pl-8 text-sm"
          />
        </div>
      </header>

      {/* ── Source filter chips ── */}
      {sources.length > 0 && (
        <div className="border-border/40 flex flex-wrap gap-1.5 border-b px-4 py-2">
          {sources.map((source, i) => {
            const isActive = activeSourceIds.size === 0 || activeSourceIds.has(source.id);
            return (
              <button
                key={source.id}
                type="button"
                onClick={() => toggleSource(source.id)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                  isActive ? chipColor(i) : 'border-border/40 bg-muted/30 text-muted-foreground/50',
                )}
                title={source.description || source.label}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-current/10 text-[9px] font-bold uppercase">
                  {source.label.charAt(0)}
                </span>
                {source.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Content area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Empty state 1 — no sources registered */}
        {noSources && (
          <EmptyState
            icon={<Compass className="text-muted-foreground/55 h-4 w-4" />}
            title="No card sources registered"
            description="Install an extension that provides card sources to browse characters from external libraries."
          />
        )}

        {/* Prompt to type */}
        {!noSources && !hasQuery && !isSearching && (
          <EmptyState
            icon={<Search className="text-muted-foreground/55 h-4 w-4" />}
            title="Type to search"
            description="Search across registered card sources to find new characters."
          />
        )}

        {/* Empty state 2 — no results for query */}
        {!noSources && hasQuery && !isSearching && results.length === 0 && (
          <EmptyState
            icon={<Search className="text-muted-foreground/55 h-4 w-4" />}
            title={`No results for "${debouncedQuery.trim()}"`}
            description="Try a different search term or check your active source filters."
            action={
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1"
                onClick={() => {
                  setQuery('');
                  setDebouncedQuery('');
                }}
              >
                <X className="h-3 w-3" />
                Clear search
              </Button>
            }
          />
        )}

        {/* Empty state 3 — all results already in library */}
        {!noSources && hasQuery && !isSearching && allInLibrary && (
          <EmptyState
            icon={<Check className="text-muted-foreground/55 h-4 w-4" />}
            title="All cards in this view are already in your library"
            description="Switch sources or search for something new."
          />
        )}

        {/* Loading state — skeleton grid */}
        {!noSources && hasQuery && isSearching && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="border-border/30 bg-muted/20 animate-pulse rounded-lg border p-3"
              >
                <div className="bg-muted/40 mb-2 aspect-square rounded" />
                <div className="bg-muted/40 mb-1 h-3 w-3/4 rounded" />
                <div className="bg-muted/40 h-2.5 w-1/2 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Card grid */}
        {!noSources && hasQuery && !isSearching && results.length > 0 && !allInLibrary && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {results.map((listing) => {
              const state = cardState(listing);
              return (
                <div
                  key={`${listing.sourceId}::${listing.cardId}`}
                  className="group border-border/40 bg-card/50 hover:bg-card/80 relative flex flex-col rounded-lg border p-3 transition-colors"
                >
                  {/* Avatar */}
                  {listing.avatarUrl ? (
                    <img
                      src={listing.avatarUrl}
                      alt={listing.name}
                      loading="lazy"
                      className="mb-2 aspect-square w-full rounded object-cover"
                    />
                  ) : (
                    <div className="bg-muted/40 text-muted-foreground/60 mb-2 flex aspect-square w-full items-center justify-center rounded text-lg font-bold uppercase">
                      {listing.name.charAt(0)}
                    </div>
                  )}

                  {/* Name */}
                  <p className="truncate text-sm font-medium">{listing.name}</p>

                  {/* Creator */}
                  {listing.creator && (
                    <p className="text-muted-foreground truncate text-[11px]">{listing.creator}</p>
                  )}

                  {/* Tags */}
                  {listing.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {listing.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="bg-muted/50 text-muted-foreground rounded px-1.5 py-0.5 text-[9px]"
                        >
                          {tag}
                        </span>
                      ))}
                      {listing.tags.length > 3 && (
                        <span className="text-muted-foreground/50 text-[9px]">
                          +{listing.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Download button */}
                  <button
                    type="button"
                    disabled={state === 'downloading' || state === 'done'}
                    onClick={() => handleDownload(listing)}
                    className={cn(
                      'absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-md border transition-colors',
                      state === 'idle' &&
                        'border-border/60 bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground',
                      state === 'downloading' &&
                        'border-border/60 bg-background/80 text-muted-foreground',
                      state === 'done' &&
                        'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
                      state === 'error' &&
                        'border-destructive/30 bg-destructive/10 text-destructive',
                    )}
                    title={
                      state === 'done'
                        ? 'Already in library'
                        : state === 'error'
                          ? 'Import failed — click to retry'
                          : state === 'downloading'
                            ? 'Importing…'
                            : 'Download to library'
                    }
                    aria-label={
                      state === 'done'
                        ? `${listing.name} — already in library`
                        : state === 'error'
                          ? `${listing.name} — import failed, click to retry`
                          : `Download ${listing.name}`
                    }
                  >
                    {state === 'idle' && <Download className="h-3.5 w-3.5" />}
                    {state === 'downloading' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {state === 'done' && <Check className="h-3.5 w-3.5" />}
                    {state === 'error' && <AlertCircle className="h-3.5 w-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
