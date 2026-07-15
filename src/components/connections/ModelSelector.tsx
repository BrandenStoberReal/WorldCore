import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  /** API source identifier (e.g. "openai", "llamacpp"). */
  source: string;
  /** Currently selected model id. */
  value: string;
  /** Called when the user picks a different model. */
  onChange: (model: string) => void;
  className?: string;
  /** Placeholder shown when no model is selected. */
  placeholder?: string;
  /** Optional extra query params appended to the fetch URL. */
  queryParams?: Record<string, string>;
}

interface ModelEntry {
  id: string;
  label: string;
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
      const qs = queryParams ? `?${new URLSearchParams(queryParams).toString()}` : '';
      const data = (await apiFetch(`/models/${source}${qs}`)) as unknown;
      const list = normalizeModels(data);
      setModels(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models');
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, [source, queryParams]);

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
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
        return { id, label };
      }
      return null;
    })
    .filter((m): m is ModelEntry => m !== null);
}
