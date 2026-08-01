import { useCallback, useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProviderForm } from './ProviderForm';
import { TEXTGEN_PROVIDERS, sourcesForCategory } from './providerConfigs';
import { useGenerationStore } from '@/lib/stores';
import { apiFetch, fetchModelContextSize } from '@/lib/api';
import type { ConnectionProfile } from '@/shared/schemas/connection-profile';

const TEXTGEN_SUBTYPES = sourcesForCategory('textgen').map((key) => ({
  value: key,
  label: TEXTGEN_PROVIDERS[key]?.name ?? key,
}));

type TextGenSubType = (typeof TEXTGEN_SUBTYPES)[number]['value'];

const BYPASS_STATUS_TYPES: ReadonlySet<TextGenSubType> = new Set(['ooba', 'generic']);

interface TextGenPanelProps {
  onConnect?: (config: Record<string, unknown>) => void;
  connected?: boolean;
  activeSource?: string;
  profile?: ConnectionProfile | null;
  onConnected?: () => void;
}

export function TextGenPanel({
  onConnect,
  connected = false,
  profile,
  onConnected,
}: TextGenPanelProps) {
  const [subType, setSubType] = useState<TextGenSubType>('llamacpp');
  const [deriveContext, setDeriveContext] = useState(true);
  const [bypassStatus, setBypassStatus] = useState(false);
  const [url, setUrl] = useState('');
  const [model, setModel] = useState('');

  useEffect(() => {
    if (profile) {
      if (profile.model) setModel(profile.model);
      if (profile.apiUrl) setUrl(profile.apiUrl);
    }
  }, [profile]);

  const config = TEXTGEN_PROVIDERS[subType];
  const showBypass = BYPASS_STATUS_TYPES.has(subType);
  const updateParam = useGenerationStore((s) => s.updateParam);

  const fetchAndSetContext = useCallback(
    async (modelId: string) => {
      if (!deriveContext) return;
      const resolvedUrl = url || 'http://localhost:8080';
      const contextSize = await fetchModelContextSize(subType, resolvedUrl, modelId);
      if (contextSize && contextSize > 0) {
        updateParam('max_context', contextSize);
        toast.success(`Context size set to ${contextSize.toLocaleString()} tokens`);
      }
    },
    [deriveContext, subType, url, updateParam],
  );

  const handleModelsLoaded = useCallback(
    (models: { id: string; label: string }[]) => {
      if (models.length > 0 && (!model || !models.find((m) => m.id === model))) {
        const first = models[0]!;
        setModel(first.id);
        updateParam('model', first.id);
        void fetchAndSetContext(first.id);
      }
    },
    [model, updateParam, fetchAndSetContext],
  );

  const handleConnect = useCallback(
    async (data: Record<string, string | boolean | number>) => {
      const connectUrl =
        (typeof data._url === 'string' && data._url) || url || 'http://localhost:8080';
      updateParam('model', model);
      if (deriveContext) {
        const contextSize = await fetchModelContextSize(subType, connectUrl, model);
        if (contextSize && contextSize > 0) {
          updateParam('max_context', contextSize);
          toast.success(`Context size set to ${contextSize.toLocaleString()} tokens`);
        }
      }

      onConnect?.({
        ...data,
        type: subType,
        subType,
        model,
        deriveContextSizeFromBackend: deriveContext,
        bypassStatusCheck: showBypass ? bypassStatus : false,
      });
    },
    [subType, deriveContext, showBypass, bypassStatus, onConnect, model, url, updateParam],
  );

  const handleModelChange = useCallback(
    (m: string) => {
      setModel(m);
      updateParam('model', m);
      void fetchAndSetContext(m);
    },
    [setModel, updateParam, fetchAndSetContext],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>API Type</Label>
        <Select value={subType} onValueChange={(v) => setSubType(v as TextGenSubType)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a provider" />
          </SelectTrigger>
          <SelectContent>
            {TEXTGEN_SUBTYPES.map((st) => (
              <SelectItem key={st.value} value={st.value}>
                {st.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {subType === 'tabby' && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>TabbyAPI support is experimental and may not work with all features.</span>
        </div>
      )}

      {config && (
        <ProviderForm
          name={config.name}
          fields={config.fields}
          showModelSelector={config.showModelSelector}
          modelSource={subType}
          showUrl={config.showUrl}
          urlPlaceholder={config.urlPlaceholder}
          connectLabel={config.connectLabel}
          onConnect={handleConnect}
          connected={connected}
          url={url}
          onUrlChange={setUrl}
          model={model}
          onModelChange={handleModelChange}
          onModelsLoaded={handleModelsLoaded}
          onConnected={onConnected}
        />
      )}

      <div className="border-border/60 bg-muted/20 space-y-3 rounded-md border px-3 py-3">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm select-none">
          <input
            type="checkbox"
            checked={deriveContext}
            onChange={(e) => setDeriveContext(e.target.checked)}
            className="border-input accent-primary h-4 w-4 shrink-0 rounded bg-transparent"
          />
          <span className="text-foreground/80">Derive context size from backend</span>
        </label>

        {showBypass && (
          <label className="flex cursor-pointer items-center gap-2.5 text-sm select-none">
            <input
              type="checkbox"
              checked={bypassStatus}
              onChange={(e) => setBypassStatus(e.target.checked)}
              className="border-input accent-primary h-4 w-4 shrink-0 rounded bg-transparent"
            />
            <span className="text-foreground/80">Bypass status check</span>
          </label>
        )}
      </div>
    </div>
  );
}
