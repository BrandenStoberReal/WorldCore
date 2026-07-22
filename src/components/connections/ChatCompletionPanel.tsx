import { useCallback, useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2, MessageSquare, Plug, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OnlineStatus } from '@/components/connections/OnlineStatus';
import { ReverseProxySection } from '@/components/connections/ReverseProxySection';
import { AzureOpenAIForm } from '@/components/connections/AzureOpenAIForm';
import { VertexAIForm } from '@/components/connections/VertexAIForm';
import { OpenRouterForm } from '@/components/connections/OpenRouterForm';
import { ModelSelector } from '@/components/connections/ModelSelector';
import { writeSecret } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ConnectionProfile } from '@/shared/schemas/connection-profile';

/* ── Types ── */

/** Identifiers that map to the SillyTavern chat_completion_source values. */
export type ChatSourceId =
  | 'openai'
  | 'custom'
  | 'ai21'
  | 'aimlapi'
  | 'azure_openai'
  | 'chutes'
  | 'claude'
  | 'workers_ai'
  | 'cohere'
  | 'deepseek'
  | 'electronhub'
  | 'fireworks'
  | 'groq'
  | 'makersuite'
  | 'vertexai'
  | 'mistralai'
  | 'minimax'
  | 'moonshot'
  | 'nanogpt'
  | 'openrouter'
  | 'perplexity'
  | 'pollinations'
  | 'siliconflow'
  | 'xai'
  | 'zai'
  | 'ollama';

export interface ChatCompletionPanelProps {
  onConnect?: (config: Record<string, unknown>) => void;
  onTestMessage?: (source: ChatSourceId, message: string) => void;
  connected?: boolean;
  activeSource?: ChatSourceId;
  onSourceChange?: (source: ChatSourceId) => void;
  profile?: ConnectionProfile | null;
  className?: string;
}

/**
 * Prompt post-processing methods.
 *
 * Matches the SillyTavern prompt post-processing dropdown.
 */
type PromptPostProcessing = 'none' | 'merge' | 'semi_strict' | 'strict' | 'exact';

const PROMPT_POST_PROCESSING_OPTIONS: ReadonlyArray<{
  value: PromptPostProcessing;
  label: string;
  description: string;
}> = [
  {
    value: 'none',
    label: 'None',
    description: 'No modification to the prompt',
  },
  {
    value: 'merge',
    label: 'Merge tools',
    description: 'Merge tool calls into a single prompt',
  },
  {
    value: 'semi_strict',
    label: 'Semi-strict',
    description: 'Partially enforce role ordering',
  },
  {
    value: 'strict',
    label: 'Strict',
    description: 'Strictly enforce role ordering',
  },
  {
    value: 'exact',
    label: 'Exact',
    description: 'Exact prompt reproduction',
  },
] as const;

/* ── Source Definitions ── */

interface SourceOption {
  id: ChatSourceId;
  label: string;
}

/** Sources displayed in the primary optgroup. */
const PRIMARY_SOURCES: SourceOption[] = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'custom', label: 'Custom (OpenAI-compatible)' },
];

/** Sources displayed in the secondary optgroup. */
const SECONDARY_SOURCES: SourceOption[] = [
  { id: 'ai21', label: 'AI21' },
  { id: 'aimlapi', label: 'AI/ML API' },
  { id: 'azure_openai', label: 'Azure OpenAI' },
  { id: 'chutes', label: 'Chutes' },
  { id: 'claude', label: 'Claude' },
  { id: 'workers_ai', label: 'Cloudflare Workers AI' },
  { id: 'cohere', label: 'Cohere' },
  { id: 'deepseek', label: 'DeepSeek' },
  { id: 'electronhub', label: 'Electron Hub' },
  { id: 'fireworks', label: 'Fireworks AI' },
  { id: 'groq', label: 'Groq' },
  { id: 'makersuite', label: 'Google AI Studio' },
  { id: 'vertexai', label: 'Google Vertex AI' },
  { id: 'mistralai', label: 'MistralAI' },
  { id: 'minimax', label: 'MiniMax' },
  { id: 'moonshot', label: 'Moonshot AI' },
  { id: 'nanogpt', label: 'NanoGPT' },
  { id: 'ollama', label: 'Ollama' },
  { id: 'openrouter', label: 'OpenRouter' },
  { id: 'perplexity', label: 'Perplexity' },
  { id: 'pollinations', label: 'Pollinations' },
  { id: 'siliconflow', label: 'SiliconFlow' },
  { id: 'xai', label: 'xAI (Grok)' },
  { id: 'zai', label: 'Z.AI (GLM)' },
];

/** Sources that support reverse proxy configuration. */
const REVERSE_PROXY_SOURCES: ReadonlySet<ChatSourceId> = new Set([
  'openai',
  'claude',
  'mistralai',
  'makersuite',
  'vertexai',
  'deepseek',
  'xai',
  'zai',
  'moonshot',
]);

/** Sources that use the dedicated Azure OpenAI form. */
const COMPLEX_SOURCES: ReadonlySet<ChatSourceId> = new Set([
  'azure_openai',
  'vertexai',
  'openrouter',
]);

/* ── Component ── */

/**
 * Chat Completion API panel.
 *
 * Orchestrates source selection, provider-specific forms, reverse proxy
 * configuration, prompt post-processing, connection controls, and status
 * display.
 */
export function ChatCompletionPanel({
  onConnect,
  onTestMessage,
  connected = false,
  activeSource,
  onSourceChange,
  profile,
  className,
}: ChatCompletionPanelProps) {
  const [source, setSource] = useState<ChatSourceId>(activeSource ?? 'openai');
  const [connecting, setConnecting] = useState(false);
  const [testMessage, setTestMessage] = useState('Hello, this is a test message.');
  const [promptPostProcessing, setPromptPostProcessing] = useState<PromptPostProcessing>('none');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');

  // Reverse proxy state
  const [proxyPreset, setProxyPreset] = useState<string>('none');
  const [proxyName, setProxyName] = useState('');
  const [proxyUrl, setProxyUrl] = useState('');
  const [proxyPassword, setProxyPassword] = useState('');

  useEffect(() => {
    if (profile) {
      if (profile.model) setModel(profile.model);
      if (profile.promptPostProcessing) {
        setPromptPostProcessing(profile.promptPostProcessing as PromptPostProcessing);
      }
      if (profile.proxy) setProxyPreset(profile.proxy);
    }
  }, [profile]);

  const handleSourceChange = useCallback(
    (value: string) => {
      const next = value as ChatSourceId;
      setSource(next);
      onSourceChange?.(next);
    },
    [onSourceChange],
  );

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    try {
      // Route the API key to /secrets/write BEFORE calling onConnect so it
      // never lands in the settings patch persisted by the parent. The config
      // object passed to onConnect is intentionally sanitized (no api_key).
      if (apiKey) {
        try {
          await writeSecret(`api_key_${source}`, apiKey, `${getSourceLabel(source)} API key`);
        } catch {
          // Secret write failure is non-fatal for the connect flow; the
          // settings save below still proceeds so the user sees feedback.
        }
      }
      onConnect?.({
        chat_completion_source: source,
        chat_completion_model: model || undefined,
        model: model || undefined,
        prompt_post_processing: promptPostProcessing,
        proxy: proxyPreset !== 'none' ? proxyPreset : undefined,
        proxy_name: proxyName || undefined,
        proxy_url: proxyUrl || undefined,
        proxy_password: proxyPassword || undefined,
      });
    } finally {
      // Keep connecting visual for a moment so the user sees feedback
      setTimeout(() => setConnecting(false), 800);
    }
  }, [
    source,
    model,
    apiKey,
    promptPostProcessing,
    proxyPreset,
    proxyName,
    proxyUrl,
    proxyPassword,
    onConnect,
  ]);

  const handleTestMessage = useCallback(() => {
    onTestMessage?.(source, testMessage);
  }, [source, testMessage, onTestMessage]);

  const showReverseProxy = REVERSE_PROXY_SOURCES.has(source);

  return (
    <div className={cn('space-y-5', className)}>
      {/* ── Header ── */}
      <div className="flex items-center gap-2">
        <MessageSquare className="text-ember/70 h-4 w-4" />
        <h3 className="text-[15px] leading-none font-semibold tracking-tight">
          Chat Completion Source
        </h3>
      </div>

      {/* ── Source Selector ── */}
      <div className="space-y-2">
        <Label>Source</Label>
        <Select value={source} onValueChange={handleSourceChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a source" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Recommended</SelectLabel>
              {PRIMARY_SOURCES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>All Providers</SelectLabel>
              {SECONDARY_SOURCES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* ── Dynamic Provider Form ── */}
      <div className="space-y-2">
        <ProviderFormArea
          source={source}
          connected={connected}
          apiKey={apiKey}
          onApiKeyChange={setApiKey}
          model={model}
          onModelChange={setModel}
        />
      </div>

      {/* ── Reverse Proxy Section ── */}
      <ReverseProxySection
        visible={showReverseProxy}
        preset={proxyPreset}
        onPresetChange={setProxyPreset}
        name={proxyName}
        onNameChange={setProxyName}
        url={proxyUrl}
        onUrlChange={setProxyUrl}
        password={proxyPassword}
        onPasswordChange={setProxyPassword}
      />

      {/* ── Prompt Post-Processing ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Prompt Post-Processing</Label>
        </div>
        <Select
          value={promptPostProcessing}
          onValueChange={(v) => setPromptPostProcessing(v as PromptPostProcessing)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROMPT_POST_PROCESSING_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="flex flex-col">
                  <span>{opt.label}</span>
                  <span className="text-muted-foreground/60 text-[11px]">{opt.description}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Connect + Test Message Buttons ── */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          type="button"
          onClick={() => void handleConnect()}
          disabled={connecting}
          className={cn('relative h-9 pr-5 pl-4', !connected && 'ember-pulse')}
        >
          {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
          <span className="text-[13px] font-semibold tracking-tight">
            {connecting ? 'Connecting...' : 'Connect'}
          </span>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleTestMessage}
          disabled={!connected}
          className="h-9"
          title={
            connected
              ? 'Send a test message to verify the connection'
              : 'Connect first before sending a test message'
          }
        >
          <Send className="h-4 w-4" />
          <span className="text-[13px]">Test Message</span>
        </Button>
      </div>

      {/* ── Test Message Input ── */}
      {connected && (
        <div className="space-y-2">
          <Label>Test Message</Label>
          <Textarea
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Enter a test message..."
            rows={2}
          />
        </div>
      )}

      {/* ── Online Status ── */}
      <OnlineStatus connected={connected} />
    </div>
  );
}

/* ── Internal: Dynamic Provider Form Area ── */

/**
 * Renders the appropriate form based on the selected source.
 *
 * - Complex sources (azure_openai, vertexai, openrouter) → dedicated form components
 * - Featherless → dedicated model browser form
 * - All others → simple API key + model selector (inline)
 */
function ProviderFormArea({
  source,
  connected,
  apiKey,
  onApiKeyChange,
  model,
  onModelChange,
}: {
  source: ChatSourceId;
  connected: boolean;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  model: string;
  onModelChange: (model: string) => void;
}) {
  // Complex providers with dedicated forms
  if (source === 'azure_openai') {
    return <AzureOpenAIForm />;
  }
  if (source === 'vertexai') {
    return <VertexAIForm />;
  }
  if (source === 'openrouter') {
    return <OpenRouterForm />;
  }

  // All other sources use the simple provider form
  return (
    <SimpleProviderForm
      source={source}
      connected={connected}
      apiKey={apiKey}
      onApiKeyChange={onApiKeyChange}
      model={model}
      onModelChange={onModelChange}
    />
  );
}

/**
 * Simple provider form for sources that just need an API key + model selector.
 * Used for: OpenAI, Claude, Groq, DeepSeek, MistralAI, Cohere, AI21, xAI, etc.
 */
function SimpleProviderForm({
  source,
  connected,
  apiKey,
  onApiKeyChange,
  model,
  onModelChange,
}: {
  source: ChatSourceId;
  connected: boolean;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  model: string;
  onModelChange: (model: string) => void;
}) {
  const [showKey, setShowKey] = useState(false);

  const sourceLabel = getSourceLabel(source);

  return (
    <div className="border-border/40 bg-muted/10 space-y-3 rounded-md border p-3">
      <p className="text-muted-foreground/60 text-[12px]">
        Configure your <span className="text-foreground/70 font-medium">{sourceLabel}</span> API
        credentials below.
      </p>

      {/* API Key */}
      <div className="space-y-2">
        <Label>{sourceLabel} API Key</Label>
        <div className="flex items-center gap-2">
          <Input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder={`Enter your ${sourceLabel} API key`}
            autoComplete="off"
            className="flex-1 font-mono text-[13px]"
          />
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setShowKey((v) => !v)}
            aria-label={showKey ? 'Hide key' : 'Show key'}
            title={showKey ? 'Hide key' : 'Show key'}
          >
            {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Model Selector — fetches models from /models/{source} after connect */}
      <div className="space-y-2">
        <Label>Model</Label>
        {connected ? (
          <ModelSelector
            source={source}
            value={model}
            onChange={onModelChange}
            placeholder="Select a model..."
          />
        ) : (
          <Select value="" onValueChange={() => {}} disabled>
            <SelectTrigger className="w-full">
              <SelectValue placeholder='Click "Connect" to load models' />
            </SelectTrigger>
            <SelectContent />
          </Select>
        )}
        <p className="text-muted-foreground/60 text-[12px]">
          {connected
            ? 'Models are loaded automatically. Use the refresh button to reload.'
            : 'Models are loaded automatically when you connect.'}
        </p>
      </div>
    </div>
  );
}

/* ── Helpers ── */

function getSourceLabel(source: ChatSourceId): string {
  const all = [...PRIMARY_SOURCES, ...SECONDARY_SOURCES];
  return all.find((s) => s.id === source)?.label ?? source;
}
