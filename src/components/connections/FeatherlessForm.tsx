import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Grid3X3, KeyRound, LayoutList, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useManageApiKey } from '@/lib/useManageApiKey';

/* ── Types ── */

export interface FeatherlessModel {
  id: string;
  name: string;
  modelClass: string;
  /** Size in parameters, e.g. "7B", "70B". */
  sizeLabel?: string;
  /** Context length if known. */
  contextLength?: number;
}

export interface FeatherlessConfig {
  apiKey: string;
  /** Currently selected model id. */
  selectedModelId: string;
}

interface FeatherlessFormProps {
  config?: Partial<FeatherlessConfig>;
  onConfigChange?: (config: Partial<FeatherlessConfig>) => void;
  className?: string;
}

type SortOrder = 'asc' | 'desc' | 'date_asc' | 'date_desc';
type CategoryFilter = 'Top' | 'New' | 'All';

const MODELS_PER_PAGE = 20;

const SORT_OPTIONS: ReadonlyArray<{ value: SortOrder; label: string }> = [
  { value: 'asc', label: 'A-Z' },
  { value: 'desc', label: 'Z-A' },
  { value: 'date_asc', label: 'Date Asc' },
  { value: 'date_desc', label: 'Date Desc' },
] as const;

const CATEGORY_OPTIONS: ReadonlyArray<{
  value: CategoryFilter;
  label: string;
}> = [
  { value: 'Top', label: 'Top' },
  { value: 'New', label: 'New' },
  { value: 'All', label: 'All' },
] as const;

/* ── Component ── */

/**
 * Featherless model browser form.
 *
 * Provides API key entry, a searchable/sortable model catalog with
 * grid/list toggle, class filter, and pagination controls.
 */
export function FeatherlessForm({ config, onConfigChange, className }: FeatherlessFormProps) {
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<FeatherlessModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKeyManager, setShowKeyManager] = useState(false);
  const {
    apiKey: managedKey,
    setApiKey: setManagedKey,
    save: saveKey,
    loading: keyLoading,
    saved: keySaved,
  } = useManageApiKey('featherless');

  // Browser state
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [category, setCategory] = useState<CategoryFilter>('Top');
  const [classFilter, setClassFilter] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const update = useCallback(
    (patch: Partial<FeatherlessConfig>) => {
      onConfigChange?.({ ...config, ...patch });
    },
    [config, onConfigChange],
  );

  // Fetch models when key is available
  useEffect(() => {
    if (!config?.apiKey) return;
    let cancelled = false;

    async function fetchModels() {
      setLoading(true);
      setError(null);
      try {
        const data = (await apiFetch('/models/featherless')) as unknown;
        if (!cancelled) {
          setModels(normalizeFeatherlessModels(data));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load models');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchModels();
    return () => {
      cancelled = true;
    };
  }, [config?.apiKey]);

  // Unique class values for the filter
  const availableClasses = useMemo(() => {
    const set = new Set(models.map((m) => m.modelClass));
    return Array.from(set).sort();
  }, [models]);

  // Filter + sort
  const filteredModels = useMemo(() => {
    let result = models;

    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (m) => m.name.toLowerCase().includes(lower) || m.id.toLowerCase().includes(lower),
      );
    }

    if (classFilter) {
      result = result.filter((m) => m.modelClass === classFilter);
    }

    result = [...result].sort((a, b) => {
      switch (sortOrder) {
        case 'asc':
          return a.name.localeCompare(b.name);
        case 'desc':
          return b.name.localeCompare(a.name);
        case 'date_asc':
          return a.id.localeCompare(b.id);
        case 'date_desc':
          return b.id.localeCompare(a.id);
      }
    });

    return result;
  }, [models, search, classFilter, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredModels.length / MODELS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagedModels = filteredModels.slice(
    (safePage - 1) * MODELS_PER_PAGE,
    safePage * MODELS_PER_PAGE,
  );

  const handleSelectModel = useCallback(
    (modelId: string) => {
      update({ selectedModelId: modelId });
    },
    [update],
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* API Key */}
      <div className="space-y-2">
        <Label>API Key</Label>
        <div className="flex items-center gap-2">
          <Input
            value={config?.apiKey ?? ''}
            onChange={(e) => update({ apiKey: e.target.value })}
            placeholder="Enter your Featherless API key"
            type={showKey ? 'text' : 'password'}
            autoComplete="off"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowKey((v) => !v)}
            aria-label={showKey ? 'Hide key' : 'Show key'}
            title={showKey ? 'Hide key' : 'Show key'}
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowKeyManager((v) => !v)}
            aria-label="Manage API keys"
            title="Manage API keys"
          >
            <KeyRound className="h-4 w-4" />
          </Button>
        </div>
        {showKeyManager && (
          <div className="border-border/60 bg-muted/20 flex items-center gap-2 rounded-md border p-2">
            <Input
              type="password"
              value={managedKey}
              onChange={(e) => setManagedKey(e.target.value)}
              placeholder={keyLoading ? 'Loading stored key...' : 'Paste stored Featherless key'}
              className="flex-1"
              autoComplete="off"
              disabled={keyLoading}
            />
            <Button type="button" size="sm" onClick={() => void saveKey()} disabled={keyLoading}>
              {keySaved ? 'Saved' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      {/* Model Browser Header */}
      <div className="space-y-2">
        <Label>Featherless Model Selection</Label>

        {/* Search + Controls row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search bar */}
          <div className="relative min-w-[180px] flex-1">
            <Search className="text-muted-foreground/50 pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search models..."
              className="h-8 pl-8 text-[13px]"
            />
          </div>

          {/* Sort Order */}
          <Select
            value={sortOrder}
            onValueChange={(v) => {
              setSortOrder(v as SortOrder);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[100px] text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category */}
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v as CategoryFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[90px] text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Class Filter */}
          <Select
            value={classFilter || '__all__'}
            onValueChange={(v) => {
              setClassFilter(v === '__all__' ? '' : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[130px] text-[13px]">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Classes</SelectItem>
              {availableClasses.map((cls) => (
                <SelectItem key={cls} value={cls}>
                  {cls}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setViewMode((v) => (v === 'list' ? 'grid' : 'list'))}
            aria-label={viewMode === 'list' ? 'Switch to grid view' : 'Switch to list view'}
            title={viewMode === 'list' ? 'Grid view' : 'List view'}
          >
            {viewMode === 'list' ? (
              <Grid3X3 className="h-4 w-4" />
            ) : (
              <LayoutList className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Pagination */}
        <div className="text-muted-foreground/60 flex items-center justify-between text-[12px]">
          <span>
            {filteredModels.length} model{filteredModels.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[12px]"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <span className="px-1">
              {safePage} / {totalPages}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[12px]"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Loading / Error states */}
      {loading && (
        <div className="text-muted-foreground/60 flex items-center justify-center gap-2 py-8 text-sm">
          <LoadingSpinner size="md" />
          Loading models...
        </div>
      )}
      {!loading && error && (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-[13px]">
          {error}
        </div>
      )}

      {/* Model Card Display */}
      {!loading && !error && (
        <div
          className={cn(
            'border-border/60 bg-muted/10 overflow-hidden rounded-md border',
            viewMode === 'grid'
              ? 'grid grid-cols-2 gap-1 p-1 sm:grid-cols-3'
              : 'divide-border/40 divide-y',
          )}
        >
          {pagedModels.length === 0 && (
            <p className="text-muted-foreground/50 p-4 text-center text-[13px]">
              {models.length === 0 && config?.apiKey
                ? 'No models available. Click Connect to load models.'
                : 'No models match your search.'}
            </p>
          )}
          {pagedModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              selected={model.id === config?.selectedModelId}
              onSelect={handleSelectModel}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function ModelCard({
  model,
  selected,
  onSelect,
  viewMode,
}: {
  model: FeatherlessModel;
  selected: boolean;
  onSelect: (id: string) => void;
  viewMode: 'list' | 'grid';
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(model.id)}
      className={cn(
        'w-full text-left transition-colors outline-none',
        viewMode === 'grid' ? 'hover:bg-accent/40 rounded-md p-2' : 'hover:bg-accent/30 px-3 py-2',
        selected && 'bg-accent/60 ring-ember/30 ring-1',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'truncate text-[13px] font-medium',
              selected ? 'text-foreground' : 'text-foreground/80',
            )}
          >
            {model.name}
          </p>
          {viewMode === 'list' && (
            <div className="mt-0.5 flex items-center gap-2">
              {model.modelClass && (
                <span className="text-muted-foreground/60 mono-tag text-[11px]">
                  {model.modelClass}
                </span>
              )}
              {model.sizeLabel && (
                <span className="text-muted-foreground/50 text-[11px]">{model.sizeLabel}</span>
              )}
              {model.contextLength != null && (
                <span className="text-muted-foreground/50 text-[11px]">
                  {(model.contextLength / 1000).toFixed(0)}k ctx
                </span>
              )}
            </div>
          )}
        </div>
        {selected && viewMode === 'grid' && (
          <span className="text-ember shrink-0 text-[10px] font-medium">Selected</span>
        )}
      </div>
    </button>
  );
}

/* ── Helpers ── */

function normalizeFeatherlessModels(data: unknown): FeatherlessModel[] {
  if (!Array.isArray(data)) return [];
  const results: FeatherlessModel[] = [];
  for (const entry of data) {
    if (!entry || typeof entry !== 'object') continue;
    const rec = entry as Record<string, unknown>;
    const id =
      (typeof rec.id === 'string' && rec.id) ||
      (typeof rec.model === 'string' && rec.model) ||
      (typeof rec.name === 'string' && rec.name) ||
      '';
    if (!id) continue;
    const name =
      (typeof rec.name === 'string' && rec.name) ||
      (typeof rec.model === 'string' && rec.model) ||
      id;
    const modelClass =
      (typeof rec.model_class === 'string' && rec.model_class) ||
      (typeof rec.modelClass === 'string' && rec.modelClass) ||
      '';
    const sizeLabel =
      (typeof rec.size_label === 'string' && rec.size_label) ||
      (typeof rec.sizeLabel === 'string' && rec.sizeLabel) ||
      undefined;
    const contextLength =
      typeof rec.context_length === 'number'
        ? rec.context_length
        : typeof rec.max_context === 'number'
          ? rec.max_context
          : undefined;
    results.push({ id, name, modelClass, sizeLabel, contextLength });
  }
  return results;
}
