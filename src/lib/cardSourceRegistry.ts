import type { CardSource } from '@/shared/types/character';

export interface CardSourceEntry {
  source: CardSource;
  extId: string;
}

const sourcesById = new Map<string, CardSourceEntry>();
const listeners = new Set<() => void>();

function notifySources(): void {
  const copy = [...listeners];
  for (const cb of copy) cb();
}

export function registerCardSource(source: CardSource, extId: string): void {
  if (!source.id || !source.id.trim()) {
    throw new Error('CardSource.id must be a non-empty string');
  }
  if (typeof source.fetchCard !== 'function') {
    throw new Error('CardSource.fetchCard must be a function');
  }
  if (source.search !== undefined && typeof source.search !== 'function') {
    throw new Error('CardSource.search must be a function');
  }
  if (source.browse !== undefined && typeof source.browse !== 'function') {
    throw new Error('CardSource.browse must be a function');
  }
  sourcesById.set(source.id, { source, extId });
  notifySources();
}

export function unregisterCardSource(sourceId: string): void {
  if (!sourcesById.has(sourceId)) return;
  sourcesById.delete(sourceId);
  notifySources();
}

export function getCardSource(sourceId: string): CardSource | undefined {
  return sourcesById.get(sourceId)?.source;
}

export function getAllCardSources(): CardSource[] {
  const result: CardSource[] = [];
  for (const entry of sourcesById.values()) {
    result.push(entry.source);
  }
  return result;
}

export function clearCardSourcesForExtId(extId: string): number {
  let removed = 0;
  for (const [id, entry] of sourcesById) {
    if (entry.extId === extId) {
      sourcesById.delete(id);
      removed++;
    }
  }
  if (removed > 0) notifySources();
  return removed;
}

export function subscribeCardSources(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function clearAllCardSources(): void {
  sourcesById.clear();
  notifySources();
}
