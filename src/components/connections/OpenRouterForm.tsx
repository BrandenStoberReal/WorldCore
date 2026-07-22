import { useCallback, useMemo, useState } from 'react';
import { Eye, EyeOff, ExternalLink, KeyRound } from 'lucide-react';
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
import { ModelSelector } from '@/components/connections/ModelSelector';
import { cn } from '@/lib/utils';
import { useManageApiKey } from '@/lib/useManageApiKey';

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  allowFallbackModels: boolean;
  providers: string[];
  allowFallbackProviders: boolean;
  quantizations: string[];
}

interface OpenRouterFormProps {
  config?: Partial<OpenRouterConfig>;
  onConfigChange?: (config: Partial<OpenRouterConfig>) => void;
  className?: string;
}

const OPENROUTER_PROVIDERS = [
  'AI21',
  'Alibaba',
  'Amazon',
  'Anthropic',
  'Arcee',
  'Cerebras',
  'Cohere',
  'DeepInfra',
  'DeepSeek',
  'Google',
  'Grok',
  'Inflection',
  'Meta',
  'Mistral',
  'Moonshot',
  'Neutrino',
  'NousResearch',
  'OpenAI',
  'Perplexity',
  'Qwen',
  'Microsoft',
  'SambaNova',
  'Together',
  'xAI',
] as const;

const QUANTIZATION_OPTIONS = [
  { value: 'int4', label: 'Integer (4 bit)' },
  { value: 'int8', label: 'Integer (8 bit)' },
  { value: 'fp4', label: 'Floating point (4 bit)' },
  { value: 'fp6', label: 'Floating point (6 bit)' },
  { value: 'fp8', label: 'Floating point (8 bit)' },
  { value: 'fp16', label: 'Floating point (16 bit)' },
  { value: 'bf16', label: 'Brain floating point (16 bit)' },
  { value: 'fp32', label: 'Floating point (32 bit)' },
  { value: 'unknown', label: 'Unknown' },
] as const;

/**
 * OpenRouter-specific configuration form.
 *
 * Includes API key, model selection, multi-select provider filtering,
 * quantization preferences, and fallback toggles.
 */
export function OpenRouterForm({ config, onConfigChange, className }: OpenRouterFormProps) {
  const [showKey, setShowKey] = useState(false);
  const [providerSearch, setProviderSearch] = useState('');
  const [quantSearch, setQuantSearch] = useState('');
  const [showKeyManager, setShowKeyManager] = useState(false);
  const {
    apiKey: managedKey,
    setApiKey: setManagedKey,
    save,
    loading,
    saved,
  } = useManageApiKey('openrouter');

  const update = useCallback(
    (patch: Partial<OpenRouterConfig>) => {
      onConfigChange?.({ ...config, ...patch });
    },
    [config, onConfigChange],
  );

  const providers = config?.providers ?? [];
  const quantizations = config?.quantizations ?? [];

  const filteredProviders = useMemo(
    () =>
      OPENROUTER_PROVIDERS.filter((p) => p.toLowerCase().includes(providerSearch.toLowerCase())),
    [providerSearch],
  );

  const filteredQuants = useMemo(
    () =>
      QUANTIZATION_OPTIONS.filter((q) => q.label.toLowerCase().includes(quantSearch.toLowerCase())),
    [quantSearch],
  );

  const toggleProvider = useCallback(
    (provider: string) => {
      const next = providers.includes(provider)
        ? providers.filter((p) => p !== provider)
        : [...providers, provider];
      update({ providers: next });
    },
    [providers, update],
  );

  const toggleQuantization = useCallback(
    (quant: string) => {
      const next = quantizations.includes(quant)
        ? quantizations.filter((q) => q !== quant)
        : [...quantizations, quant];
      update({ quantizations: next });
    },
    [quantizations, update],
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* API Key */}
      <div className="space-y-2">
        <Label>OpenRouter API Key</Label>
        <p className="text-muted-foreground/60 text-[12px]">
          Click &quot;Authorize&quot; below or get the key from{' '}
          <a
            href="https://openrouter.ai/keys/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/70 hover:text-foreground underline underline-offset-2 transition-colors"
          >
            OpenRouter
            <ExternalLink className="-mt-0.5 ml-0.5 inline h-3 w-3" />
          </a>
          .{' '}
          <a
            href="https://openrouter.ai/settings/credits"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/70 hover:text-foreground underline underline-offset-2 transition-colors"
          >
            View Remaining Credits
            <ExternalLink className="-mt-0.5 ml-0.5 inline h-3 w-3" />
          </a>
        </p>
        <div className="flex items-center gap-2">
          <Input
            value={config?.apiKey ?? ''}
            onChange={(e) => update({ apiKey: e.target.value })}
            placeholder="Enter your OpenRouter API key"
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
              placeholder={loading ? 'Loading stored key...' : 'Paste stored OpenRouter key'}
              className="flex-1"
              autoComplete="off"
              disabled={loading}
            />
            <Button type="button" size="sm" onClick={() => void save()} disabled={loading}>
              {saved ? 'Saved' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      {/* Model Selection */}
      <div className="space-y-2">
        <Label>OpenRouter Model</Label>
        <ModelSelector
          source="openrouter"
          value={config?.model ?? ''}
          onChange={(model) => update({ model })}
        />
      </div>

      {/* Allow Fallback Models */}
      <label className="flex cursor-pointer items-center gap-2 text-sm select-none">
        <input
          type="checkbox"
          checked={config?.allowFallbackModels ?? false}
          onChange={(e) => update({ allowFallbackModels: e.target.checked })}
          className="border-input accent-primary h-4 w-4 shrink-0 rounded"
        />
        Allow fallback models
      </label>

      {/* Model Providers (multi-select) */}
      <div className="space-y-2">
        <Label>Model Providers</Label>
        <p className="text-muted-foreground/60 text-[12px]">
          Hold Ctrl/Cmd to select multiple providers.
        </p>
        <Input
          value={providerSearch}
          onChange={(e) => setProviderSearch(e.target.value)}
          placeholder="Search providers..."
          className="h-8 text-[13px]"
        />
        <div className="border-border/60 bg-muted/10 max-h-48 overflow-y-auto rounded-md border p-1">
          {filteredProviders.length === 0 && (
            <p className="text-muted-foreground/50 px-2 py-1 text-[12px]">
              No providers match your search.
            </p>
          )}
          {filteredProviders.map((p) => (
            <label
              key={p}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-[13px] transition-colors select-none',
                providers.includes(p)
                  ? 'bg-accent/60 text-accent-foreground'
                  : 'hover:bg-accent/30 text-foreground/70',
              )}
            >
              <input
                type="checkbox"
                checked={providers.includes(p)}
                onChange={() => toggleProvider(p)}
                className="border-input accent-primary h-3.5 w-3.5 shrink-0 rounded"
              />
              {p}
            </label>
          ))}
        </div>
        {providers.length > 0 && (
          <p className="text-muted-foreground/60 text-[12px]">
            {providers.length} provider{providers.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      {/* Allow Fallback Providers */}
      <label className="flex cursor-pointer items-center gap-2 text-sm select-none">
        <input
          type="checkbox"
          checked={config?.allowFallbackProviders ?? false}
          onChange={(e) => update({ allowFallbackProviders: e.target.checked })}
          className="border-input accent-primary h-4 w-4 shrink-0 rounded"
        />
        Allow fallback providers
      </label>

      {/* Model Quantizations (multi-select) */}
      <div className="space-y-2">
        <Label>Model Quantizations</Label>
        <p className="text-muted-foreground/60 text-[12px]">
          Hold Ctrl/Cmd to select multiple quantizations.
        </p>
        <Input
          value={quantSearch}
          onChange={(e) => setQuantSearch(e.target.value)}
          placeholder="Search quantizations..."
          className="h-8 text-[13px]"
        />
        <div className="border-border/60 bg-muted/10 max-h-48 overflow-y-auto rounded-md border p-1">
          {filteredQuants.length === 0 && (
            <p className="text-muted-foreground/50 px-2 py-1 text-[12px]">
              No quantizations match your search.
            </p>
          )}
          {filteredQuants.map((q) => (
            <label
              key={q.value}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-[13px] transition-colors select-none',
                quantizations.includes(q.value)
                  ? 'bg-accent/60 text-accent-foreground'
                  : 'hover:bg-accent/30 text-foreground/70',
              )}
            >
              <input
                type="checkbox"
                checked={quantizations.includes(q.value)}
                onChange={() => toggleQuantization(q.value)}
                className="border-input accent-primary h-3.5 w-3.5 shrink-0 rounded"
              />
              {q.label}
            </label>
          ))}
        </div>
        {quantizations.length > 0 && (
          <p className="text-muted-foreground/60 text-[12px]">
            {quantizations.length} quantization{quantizations.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      <p className="text-muted-foreground/60 text-[12px] italic">
        To use instruct formatting, switch to OpenRouter under Text Completion API.
      </p>
    </div>
  );
}
