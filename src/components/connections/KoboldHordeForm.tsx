import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Key, Plug, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { useManageApiKey } from '@/lib/useManageApiKey';
import { OnlineStatus } from './OnlineStatus';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KoboldHordeFormProps {
  onConnect?: (config: Record<string, unknown>) => void;
  connected?: boolean;
}

interface HordeModel {
  id: string;
  name: string;
  count: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HORDE_LINKS = [
  {
    href: 'https://aihorde.net/',
    label: 'AI Horde Website',
    external: true,
  },
  {
    href: 'https://docs.sillytavern.app/usage/api-connections/horde/',
    label: 'Review the Privacy statement',
    external: true,
  },
  {
    href: 'https://aihorde.net/register',
    label: 'Register a Horde account for faster queue times',
    external: true,
  },
  {
    href: 'https://github.com/Haidra-Org/horde-worker-reGen',
    label: 'Learn how to contribute your idle GPU cycles to the Horde',
    external: true,
  },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KoboldHordeForm({ onConnect, connected = false }: KoboldHordeFormProps) {
  const [apiKey, setApiKey] = useState('');
  const [adjustedContext, setAdjustedContext] = useState(true);
  const [adjustedResponse, setAdjustedResponse] = useState(true);
  const [trustedOnly, setTrustedOnly] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<HordeModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [showKeyManager, setShowKeyManager] = useState(false);
  const {
    apiKey: managedKey,
    setApiKey: setManagedKey,
    save,
    loading,
    saved,
  } = useManageApiKey('koboldhorde');

  // ------ Model fetching ------

  const fetchModels = useCallback(async () => {
    setLoadingModels(true);
    setModelError(null);
    try {
      const data = (await apiFetch('/models/koboldhorde')) as unknown;
      const models = normalizeHordeModels(data);
      setAvailableModels(models);
    } catch (err) {
      setModelError(err instanceof Error ? err.message : 'Failed to load Horde models');
      setAvailableModels([]);
    } finally {
      setLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    void fetchModels();
  }, [fetchModels]);

  // ------ Model multi-select ------

  const toggleModel = useCallback((modelId: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId],
    );
  }, []);

  // ------ Connect ------

  const handleConnect = useCallback(() => {
    setConnecting(true);
    onConnect?.({
      type: 'koboldhorde',
      apiKey: apiKey || '0000000000',
      adjustContext: adjustedContext,
      adjustResponse: adjustedResponse,
      trustedWorkers: trustedOnly,
      models: selectedModels,
    });
  }, [apiKey, adjustedContext, adjustedResponse, trustedOnly, selectedModels, onConnect]);

  const handleCancel = useCallback(() => {
    setConnecting(false);
  }, []);

  return (
    <div className="space-y-5">
      {/* Informational links */}
      <ul className="text-muted-foreground space-y-1.5 text-sm">
        {HORDE_LINKS.map((link) => (
          <li key={link.href} className="flex items-start gap-1.5">
            <span className="bg-muted-foreground/40 mt-1.5 h-1 w-1 shrink-0 rounded-full" />
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex items-center gap-1 hover:underline"
            >
              {link.label}
              {link.external && <ExternalLink className="h-3 w-3 shrink-0" />}
            </a>
          </li>
        ))}
      </ul>

      {/* Privacy notice */}
      <p className="text-muted-foreground/80 text-sm">
        Avoid sending sensitive information to the Horde.
      </p>

      {/* Checkboxes */}
      <div className="border-border/60 bg-muted/20 space-y-2.5 rounded-md border px-3 py-3">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm select-none">
          <input
            type="checkbox"
            checked={adjustedContext}
            onChange={(e) => setAdjustedContext(e.target.checked)}
            className="border-border accent-primary size-4 shrink-0 rounded"
          />
          <span className="text-foreground/80">Adjust context size to worker capabilities</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm select-none">
          <input
            type="checkbox"
            checked={adjustedResponse}
            onChange={(e) => setAdjustedResponse(e.target.checked)}
            className="border-border accent-primary size-4 shrink-0 rounded"
          />
          <span className="text-foreground/80">Adjust response length to worker capabilities</span>
        </label>
        <label
          className="flex cursor-pointer items-center gap-2.5 text-sm select-none"
          title="Can help with bad responses..."
        >
          <input
            type="checkbox"
            checked={trustedOnly}
            onChange={(e) => setTrustedOnly(e.target.checked)}
            className="border-border accent-primary size-4 shrink-0 rounded"
          />
          <span className="text-foreground/80">Trusted workers only</span>
        </label>
      </div>

      {/* API Key */}
      <div className="space-y-2">
        <Label>API Key</Label>
        <p className="text-muted-foreground text-xs">
          Get it here:{' '}
          <a
            href="https://aihorde.net/register"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Register
          </a>{' '}
          · Enter <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">0000000000</code>{' '}
          for anonymous mode.
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter Horde API key"
            className="flex-1"
            autoComplete="off"
          />
          <Button
            type="button"
            variant="default"
            size="icon"
            onClick={handleConnect}
            title="Save and connect"
            aria-label="Save and connect"
          >
            <Plug className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Manage API keys"
            aria-label="Manage API keys"
            onClick={() => setShowKeyManager((v) => !v)}
          >
            <Key className="h-4 w-4" />
          </Button>
        </div>
        {showKeyManager && (
          <div className="border-border/60 bg-muted/20 flex items-center gap-2 rounded-sm border p-2">
            <Input
              type="password"
              value={managedKey}
              onChange={(e) => setManagedKey(e.target.value)}
              placeholder={loading ? 'Loading stored key...' : 'Paste stored Horde key'}
              className="flex-1"
              autoComplete="off"
              disabled={loading}
            />
            <Button type="button" size="sm" onClick={() => void save()} disabled={loading}>
              {saved ? 'Saved' : 'Save'}
            </Button>
          </div>
        )}
        <p className="text-muted-foreground/70 text-xs italic">
          For privacy reasons, your API key will be hidden after you click &quot;Connect&quot;.
        </p>
      </div>

      {/* Model multi-select */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Models</Label>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => void fetchModels()}
            disabled={loadingModels}
            title="Refresh models"
            aria-label="Refresh models"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loadingModels && 'animate-spin')} />
          </Button>
        </div>

        {modelError && <p className="text-destructive text-xs">{modelError}</p>}

        <div className="border-border/60 bg-muted/10 max-h-48 overflow-y-auto rounded-md border">
          {loadingModels && availableModels.length === 0 && (
            <div className="text-muted-foreground flex items-center justify-center py-6 text-sm">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Loading models...
            </div>
          )}

          {!loadingModels && availableModels.length === 0 && !modelError && (
            <p className="text-muted-foreground py-6 text-center text-sm">No models available</p>
          )}

          {availableModels.map((model) => (
            <label
              key={model.id}
              className={cn(
                'border-border/30 flex cursor-pointer items-center gap-2.5 border-b px-3 py-2 text-sm transition-colors select-none last:border-b-0',
                selectedModels.includes(model.id) ? 'bg-primary/5' : 'hover:bg-accent/30',
              )}
            >
              <input
                type="checkbox"
                checked={selectedModels.includes(model.id)}
                onChange={() => toggleModel(model.id)}
                className="border-border accent-primary size-3.5 shrink-0 rounded"
              />
              <span className="text-foreground/80 flex-1 truncate">{model.name || model.id}</span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {model.count} worker{model.count !== 1 ? 's' : ''}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Connect / Cancel */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={handleConnect}
          disabled={connecting}
          className={cn(
            'gap-1.5',
            connected && 'bg-emerald-600 text-white hover:bg-emerald-600/90',
          )}
        >
          <Plug className="h-4 w-4" />
          {connected ? 'Connected' : 'Connect'}
        </Button>
        {connecting && (
          <Button type="button" variant="outline" onClick={handleCancel} className="gap-1.5">
            <X className="h-4 w-4" />
            Cancel
          </Button>
        )}
      </div>

      {/* Status */}
      <OnlineStatus connected={connected} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeHordeModels(data: unknown): HordeModel[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((entry) => {
      if (entry && typeof entry === 'object') {
        const rec = entry as Record<string, unknown>;
        const id =
          (typeof rec.id === 'string' && rec.id) ||
          (typeof rec.model === 'string' && rec.model) ||
          (typeof rec.name === 'string' && rec.name) ||
          '';
        if (!id) return null;
        const name =
          (typeof rec.name === 'string' && rec.name) ||
          (typeof rec.label === 'string' && rec.label) ||
          id;
        const count = typeof rec.count === 'number' ? rec.count : 0;
        return { id, name, count };
      }
      return null;
    })
    .filter((m): m is HordeModel => m !== null);
}
