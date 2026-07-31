import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  source: string;
  value: string;
  onChange: (model: string) => void;
  className?: string;
  placeholder?: string;
  queryParams?: Record<string, string>;
  url?: string;
  onModelsLoaded?: (models: ModelEntry[]) => void;
  onConnected?: () => void;
}

interface ModelEntry {
  id: string;
  label: string;
  context_length?: number;
}

/**
 * Reusable model selector.
 *
 * Fetches the list of available models from `/api/v1/models/{source}` whenever
 * the `source` changes (or when the user hits the refresh button). While
 * loading, a spinner replaces the dropdown contents. Errors are surfaced as a
 * single disabled option so the UI never breaks.
 */
export function ModelSelector({
  source,
  value,
  onChange,
  className,
  placeholder = 'Select a model...',
  queryParams,
  url,
  onModelsLoaded,
  onConnected,
}: ModelSelectorProps) {
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    if (!source) {
      setModels([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { ...queryParams };
      if (url) params.url = url;
      const qs = Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : '';
      const data = (await apiFetch(`/models/${source}${qs}`)) as unknown;
      const list = normalizeModels(data);
      setModels(list);
      onModelsLoaded?.(list);
      if (list.length > 0) onConnected?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models');
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, [source, queryParams, url, onModelsLoaded, onConnected]);

  useEffect(() => {
    void fetchModels();
  }, [fetchModels]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Select value={value || undefined} onValueChange={onChange} disabled={loading}>
        <SelectTrigger className="min-w-0 flex-1">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {loading && (
            <div className="text-muted-foreground flex items-center gap-2 px-2 py-1.5 text-sm">
              <LoadingSpinner size="sm" />
              <span>Loading models...</span>
            </div>
          )}
          {!loading && error && (
            <SelectItem value="__error__" disabled>
              <span className="text-destructive">Error: {error}</span>
            </SelectItem>
          )}
          {!loading && !error && models.length === 0 && (
            <SelectItem value="__empty__" disabled>
              No models available
            </SelectItem>
          )}
          {!loading &&
            !error &&
            models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.label}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => void fetchModels()}
        disabled={loading}
        aria-label="Refresh models"
        title="Refresh models"
      >
        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
      </Button>
    </div>
  );
}

/**
 * Coerce a variety of common API response shapes into a flat list of
 * `{ id, label }` entries. Handles:
 *  - `string[]`
 *  - `{ id: string }[]`
 *  - `{ model: string }[]` (OpenAI-style)
 *  - `{ name: string }[]`
 */
function normalizeModels(data: unknown): ModelEntry[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((entry) => {
      if (typeof entry === 'string') return { id: entry, label: entry };
      if (entry && typeof entry === 'object') {
        const rec = entry as Record<string, unknown>;
        const id =
          (typeof rec.id === 'string' && rec.id) ||
          (typeof rec.model === 'string' && rec.model) ||
          (typeof rec.name === 'string' && rec.name) ||
          '';
        if (!id) return null;
        const label =
          (typeof rec.label === 'string' && rec.label) ||
          (typeof rec.name === 'string' && rec.name) ||
          id;
        const context_length =
          typeof rec.context_length === 'number' ? rec.context_length : undefined;
        return { id, label, context_length };
      }
      return null;
    })
    .filter((m): m is ModelEntry => m !== null);
}
