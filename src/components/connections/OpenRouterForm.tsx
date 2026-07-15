import { useCallback, useMemo, useState } from "react";
import { Eye, EyeOff, ExternalLink, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModelSelector } from "@/components/connections/ModelSelector";
import { cn } from "@/lib/utils";

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
  onManageKeys?: () => void;
  className?: string;
}

const OPENROUTER_PROVIDERS = [
  "AI21",
  "Alibaba",
  "Amazon",
  "Anthropic",
  "Arcee",
  "Cerebras",
  "Cohere",
  "DeepInfra",
  "DeepSeek",
  "Google",
  "Grok",
  "Inflection",
  "Meta",
  "Mistral",
  "Moonshot",
  "Neutrino",
  "NousResearch",
  "OpenAI",
  "Perplexity",
  "Qwen",
  "Microsoft",
  "SambaNova",
  "Together",
  "xAI",
] as const;

const QUANTIZATION_OPTIONS = [
  { value: "int4", label: "Integer (4 bit)" },
  { value: "int8", label: "Integer (8 bit)" },
  { value: "fp4", label: "Floating point (4 bit)" },
  { value: "fp6", label: "Floating point (6 bit)" },
  { value: "fp8", label: "Floating point (8 bit)" },
  { value: "fp16", label: "Floating point (16 bit)" },
  { value: "bf16", label: "Brain floating point (16 bit)" },
  { value: "fp32", label: "Floating point (32 bit)" },
  { value: "unknown", label: "Unknown" },
] as const;

/**
 * OpenRouter-specific configuration form.
 *
 * Includes API key, model selection, multi-select provider filtering,
 * quantization preferences, and fallback toggles.
 */
export function OpenRouterForm({
  config,
  onConfigChange,
  onManageKeys,
  className,
}: OpenRouterFormProps) {
  const [showKey, setShowKey] = useState(false);
  const [providerSearch, setProviderSearch] = useState("");
  const [quantSearch, setQuantSearch] = useState("");

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
      OPENROUTER_PROVIDERS.filter((p) =>
        p.toLowerCase().includes(providerSearch.toLowerCase()),
      ),
    [providerSearch],
  );

  const filteredQuants = useMemo(
    () =>
      QUANTIZATION_OPTIONS.filter((q) =>
        q.label.toLowerCase().includes(quantSearch.toLowerCase()),
      ),
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
    <div className={cn("space-y-4", className)}>
      {/* API Key */}
      <div className="space-y-2">
        <Label>OpenRouter API Key</Label>
        <p className="text-[12px] text-muted-foreground/60">
          Click &quot;Authorize&quot; below or get the key from{" "}
          <a
            href="https://openrouter.ai/keys/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/70 underline underline-offset-2 hover:text-foreground transition-colors"
          >
            OpenRouter
            <ExternalLink className="inline h-3 w-3 ml-0.5 -mt-0.5" />
          </a>
          .{" "}
          <a
            href="https://openrouter.ai/settings/credits"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/70 underline underline-offset-2 hover:text-foreground transition-colors"
          >
            View Remaining Credits
            <ExternalLink className="inline h-3 w-3 ml-0.5 -mt-0.5" />
          </a>
        </p>
        <div className="flex items-center gap-2">
          <Input
            value={config?.apiKey ?? ""}
            onChange={(e) => update({ apiKey: e.target.value })}
            placeholder="Enter your OpenRouter API key"
            type={showKey ? "text" : "password"}
            autoComplete="off"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowKey((v) => !v)}
            aria-label={showKey ? "Hide key" : "Show key"}
            title={showKey ? "Hide key" : "Show key"}
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onManageKeys}
            aria-label="Manage API keys"
            title="Manage API keys"
          >
            <KeyRound className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Model Selection */}
      <div className="space-y-2">
        <Label>OpenRouter Model</Label>
        <ModelSelector
          source="openrouter"
          value={config?.model ?? ""}
          onChange={(model) => update({ model })}
        />
      </div>

      {/* Allow Fallback Models */}
      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          checked={config?.allowFallbackModels ?? false}
          onChange={(e) => update({ allowFallbackModels: e.target.checked })}
          className="h-4 w-4 rounded border-input accent-primary shrink-0"
        />
        Allow fallback models
      </label>

      {/* Model Providers (multi-select) */}
      <div className="space-y-2">
        <Label>Model Providers</Label>
        <p className="text-[12px] text-muted-foreground/60">
          Hold Ctrl/Cmd to select multiple providers.
        </p>
        <Input
          value={providerSearch}
          onChange={(e) => setProviderSearch(e.target.value)}
          placeholder="Search providers..."
          className="h-8 text-[13px]"
        />
        <div className="rounded-md border border-border/60 bg-muted/10 p-1 max-h-48 overflow-y-auto">
          {filteredProviders.length === 0 && (
            <p className="text-[12px] text-muted-foreground/50 px-2 py-1">
              No providers match your search.
            </p>
          )}
          {filteredProviders.map((p) => (
            <label
              key={p}
              className={cn(
                "flex items-center gap-2 px-2 py-1 rounded-sm text-[13px] cursor-pointer transition-colors select-none",
                providers.includes(p)
                  ? "bg-accent/60 text-accent-foreground"
                  : "hover:bg-accent/30 text-foreground/70",
              )}
            >
              <input
                type="checkbox"
                checked={providers.includes(p)}
                onChange={() => toggleProvider(p)}
                className="h-3.5 w-3.5 rounded border-input accent-primary shrink-0"
              />
              {p}
            </label>
          ))}
        </div>
        {providers.length > 0 && (
          <p className="text-[12px] text-muted-foreground/60">
            {providers.length} provider{providers.length !== 1 ? "s" : ""} selected
          </p>
        )}
      </div>

      {/* Allow Fallback Providers */}
      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          checked={config?.allowFallbackProviders ?? false}
          onChange={(e) => update({ allowFallbackProviders: e.target.checked })}
          className="h-4 w-4 rounded border-input accent-primary shrink-0"
        />
        Allow fallback providers
      </label>

      {/* Model Quantizations (multi-select) */}
      <div className="space-y-2">
        <Label>Model Quantizations</Label>
        <p className="text-[12px] text-muted-foreground/60">
          Hold Ctrl/Cmd to select multiple quantizations.
        </p>
        <Input
          value={quantSearch}
          onChange={(e) => setQuantSearch(e.target.value)}
          placeholder="Search quantizations..."
          className="h-8 text-[13px]"
        />
        <div className="rounded-md border border-border/60 bg-muted/10 p-1 max-h-48 overflow-y-auto">
          {filteredQuants.length === 0 && (
            <p className="text-[12px] text-muted-foreground/50 px-2 py-1">
              No quantizations match your search.
            </p>
          )}
          {filteredQuants.map((q) => (
            <label
              key={q.value}
              className={cn(
                "flex items-center gap-2 px-2 py-1 rounded-sm text-[13px] cursor-pointer transition-colors select-none",
                quantizations.includes(q.value)
                  ? "bg-accent/60 text-accent-foreground"
                  : "hover:bg-accent/30 text-foreground/70",
              )}
            >
              <input
                type="checkbox"
                checked={quantizations.includes(q.value)}
                onChange={() => toggleQuantization(q.value)}
                className="h-3.5 w-3.5 rounded border-input accent-primary shrink-0"
              />
              {q.label}
            </label>
          ))}
        </div>
        {quantizations.length > 0 && (
          <p className="text-[12px] text-muted-foreground/60">
            {quantizations.length} quantization{quantizations.length !== 1 ? "s" : ""} selected
          </p>
        )}
      </div>

      <p className="text-[12px] text-muted-foreground/60 italic">
        To use instruct formatting, switch to OpenRouter under Text Completion API.
      </p>
    </div>
  );
}
