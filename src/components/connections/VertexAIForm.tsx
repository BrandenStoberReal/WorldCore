import { useState } from 'react';
import { Eye, EyeOff, FileCheck, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useManageApiKey } from '@/lib/useManageApiKey';

export type VertexAIAuthMode = 'express' | 'full';

export interface VertexAIConfig {
  authMode: VertexAIAuthMode;
  /** Express mode: API key. */
  apiKey: string;
  /** Express mode: project ID (optional for us-central1). */
  projectId: string;
  /** Full mode: service account JSON content. */
  serviceAccountJson: string;
  /** Region for both modes. */
  region: string;
  /** Selected Google model. */
  model: string;
}

interface VertexAIFormProps {
  config?: Partial<VertexAIConfig>;
  onConfigChange?: (config: Partial<VertexAIConfig>) => void;
  className?: string;
}

const GEMINI_MODELS = [
  {
    group: 'Gemini 3.1',
    models: [
      { value: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro' },
      { value: 'gemini-3.1-flash', label: 'Gemini 3.1 Flash' },
      { value: 'gemini-3.1-pro-exp-07-17', label: 'Gemini 3.1 Pro (Experimental)' },
    ],
  },
  {
    group: 'Gemini 2.5',
    models: [
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { value: 'gemini-2.5-pro-preview-06-05', label: 'Gemini 2.5 Pro Preview' },
      { value: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash Preview' },
    ],
  },
  {
    group: 'Gemini 2.0',
    models: [
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
      { value: 'gemini-2.0-pro-exp-02-05', label: 'Gemini 2.0 Pro (Experimental)' },
    ],
  },
  {
    group: 'Gemini 1.5',
    models: [
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    ],
  },
] as const;

const VERTEX_REGIONS = [
  'global',
  'us-central1',
  'us-east1',
  'us-east4',
  'us-west1',
  'us-west4',
  'europe-west1',
  'europe-west2',
  'europe-west3',
  'europe-west4',
  'europe-west8',
  'europe-west9',
  'asia-east1',
  'asia-east2',
  'asia-northeast1',
  'asia-south1',
  'asia-southeast1',
  'me-west1',
  'me-central1',
] as const;

/**
 * Google Vertex AI configuration form.
 *
 * Supports two authentication modes:
 *  - Express: API key + optional project ID
 *  - Full: Service account JSON content
 *
 * Both modes share a region selector and model picker.
 */
export function VertexAIForm({ config, onConfigChange, className }: VertexAIFormProps) {
  const [showKey, setShowKey] = useState(false);
  const [showServiceAccount, setShowServiceAccount] = useState(false);
  const [showKeyManager, setShowKeyManager] = useState(false);
  const {
    apiKey: managedKey,
    setApiKey: setManagedKey,
    save,
    loading,
    saved,
  } = useManageApiKey('vertexai');

  const update = (patch: Partial<VertexAIConfig>) => {
    onConfigChange?.({ ...config, ...patch });
  };

  const authMode = config?.authMode ?? 'express';

  const handleValidateJson = () => {
    try {
      JSON.parse(config?.serviceAccountJson ?? '');
      alert('Valid JSON');
    } catch {
      alert('Invalid JSON');
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Auth Mode Selector */}
      <div className="space-y-2">
        <Label>Authentication Mode</Label>
        <Select value={authMode} onValueChange={(v) => update({ authMode: v as VertexAIAuthMode })}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select authentication mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="express">Express Mode (API Key)</SelectItem>
            <SelectItem value="full">Full Version (Service Account)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Express Mode Config */}
      {authMode === 'express' && (
        <div className="border-border/40 bg-muted/10 space-y-4 rounded-md border p-3">
          {/* API Key */}
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="flex items-center gap-2">
              <Input
                value={config?.apiKey ?? ''}
                onChange={(e) => update({ apiKey: e.target.value })}
                placeholder="Enter your Google AI API key"
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
              <div className="border-border/60 bg-muted/20 flex items-center gap-2 rounded-sm border p-2">
                <Input
                  type="password"
                  value={managedKey}
                  onChange={(e) => setManagedKey(e.target.value)}
                  placeholder={loading ? 'Loading stored key...' : 'Paste stored Vertex AI key'}
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

          {/* Project ID */}
          <div className="space-y-2">
            <Label>Project ID</Label>
            <Input
              value={config?.projectId ?? ''}
              onChange={(e) => update({ projectId: e.target.value })}
              placeholder="Enter your Project ID"
            />
            <p className="text-muted-foreground/60 text-[12px]">
              Project ID is only required when selecting regions other than the default
              (us-central1).
            </p>
          </div>
        </div>
      )}

      {/* Full Version Config */}
      {authMode === 'full' && (
        <div className="border-border/40 bg-muted/10 space-y-4 rounded-md border p-3">
          {/* Service Account JSON */}
          <div className="space-y-2">
            <Label>Service Account Configuration</Label>
            <Label className="text-muted-foreground/60 text-[12px] font-normal">
              Service Account JSON Content
            </Label>
            <div className="flex items-center gap-2">
              <Input
                value={config?.serviceAccountJson ?? ''}
                onChange={(e) => update({ serviceAccountJson: e.target.value })}
                placeholder="Paste your service account JSON content"
                type={showServiceAccount ? 'text' : 'password'}
                autoComplete="off"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowServiceAccount((v) => !v)}
                aria-label={showServiceAccount ? 'Hide content' : 'Show content'}
                title={showServiceAccount ? 'Hide content' : 'Show content'}
              >
                {showServiceAccount ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleValidateJson}
              disabled={!config?.serviceAccountJson}
            >
              <FileCheck className="h-3.5 w-3.5" />
              Validate JSON
            </Button>
          </div>
        </div>
      )}

      {/* Region */}
      <div className="space-y-2">
        <Label>Region</Label>
        <input
          type="text"
          list="vertexai-region-suggestions"
          value={config?.region ?? 'us-central1'}
          onChange={(e) => update({ region: e.target.value })}
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] md:text-sm"
        />
        <datalist id="vertexai-region-suggestions">
          {VERTEX_REGIONS.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </div>

      {/* Model Selection */}
      <div className="space-y-2">
        <Label>Google Model</Label>
        <Select value={config?.model ?? ''} onValueChange={(v) => update({ model: v })}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {GEMINI_MODELS.map((optgroup) => (
              <SelectGroup key={optgroup.group}>
                <SelectLabel>{optgroup.group}</SelectLabel>
                {optgroup.models.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
