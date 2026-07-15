import { useCallback, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OnlineStatus } from './OnlineStatus';
import { ProviderForm } from './ProviderForm';
import { TEXTGEN_PROVIDERS, sourcesForCategory } from './providerConfigs';

// ---------------------------------------------------------------------------
// Sub-type definitions (mirrors SillyTavern #textgen_type select)
// ---------------------------------------------------------------------------

const TEXTGEN_SUBTYPES = sourcesForCategory('textgen').map((key) => ({
  value: key,
  label: TEXTGEN_PROVIDERS[key]?.name ?? key,
}));

type TextGenSubType = (typeof TEXTGEN_SUBTYPES)[number]['value'];

/** Sub-types that expose a "Bypass status check" option. */
const BYPASS_STATUS_TYPES: ReadonlySet<TextGenSubType> = new Set(['ooba', 'generic']);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TextGenPanelProps {
  onConnect?: (config: Record<string, unknown>) => void;
  connected?: boolean;
  activeSource?: string;
}

/**
 * Text Completion API panel.
 *
 * Mirrors the SillyTavern `#textgenerationwebui_api` section with a sub-type
 * selector that swaps between 15 different text-generation providers. Each
 * sub-type renders a `ProviderForm` with the appropriate field config from
 * `providerConfigs`.
 */
export function TextGenPanel({ onConnect, connected = false }: TextGenPanelProps) {
  const [subType, setSubType] = useState<TextGenSubType>('llamacpp');
  const [deriveContext, setDeriveContext] = useState(true);
  const [bypassStatus, setBypassStatus] = useState(false);
  const [url, setUrl] = useState('');
  const [model, setModel] = useState('');

  const config = TEXTGEN_PROVIDERS[subType];
  const showBypass = BYPASS_STATUS_TYPES.has(subType);

  const handleConnect = useCallback(
    (data: Record<string, string | boolean | number>) => {
      onConnect?.({
        ...data,
        type: 'textgenerationwebui',
        subType,
        deriveContextSizeFromBackend: deriveContext,
        bypassStatusCheck: showBypass ? bypassStatus : false,
      });
    },
    [subType, deriveContext, showBypass, bypassStatus, onConnect],
  );

  return (
    <div className="space-y-4">
      {/* Sub-type selector */}
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

      {/* TabbyAPI experimental warning */}
      {subType === 'tabby' && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>TabbyAPI support is experimental and may not work with all features.</span>
        </div>
      )}

      {/* Provider-specific form via ProviderForm */}
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
          onModelChange={setModel}
        />
      )}

      {/* Options */}
      <div className="border-border/60 bg-muted/20 space-y-3 rounded-md border px-3 py-3">
        {/* Derive context size */}
        <label className="flex cursor-pointer items-center gap-2.5 text-sm select-none">
          <input
            type="checkbox"
            checked={deriveContext}
            onChange={(e) => setDeriveContext(e.target.checked)}
            className="border-input accent-primary h-4 w-4 shrink-0 rounded bg-transparent"
          />
          <span className="text-foreground/80">Derive context size from backend</span>
        </label>

        {/* Bypass status check (conditional) */}
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

      {/* Connection status */}
      <OnlineStatus
        connected={connected}
        text={connected ? `Connected to ${config?.name ?? subType}` : undefined}
      />
    </div>
  );
}
