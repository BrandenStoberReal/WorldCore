import { useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
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
import { cn } from '@/lib/utils';

export interface AzureOpenAIConfig {
  baseUrl: string;
  deploymentName: string;
  apiVersion: string;
  apiKey: string;
  model: string;
}

interface AzureOpenAIFormProps {
  config?: Partial<AzureOpenAIConfig>;
  onConfigChange?: (config: Partial<AzureOpenAIConfig>) => void;
  /** Called when user wants to manage stored keys. */
  onManageKeys?: () => void;
  className?: string;
}

const API_VERSIONS = [
  { value: '2025-04-01-preview', label: '2025-04-01-preview' },
  { value: '2024-12-01-preview', label: '2024-12-01-preview' },
  { value: '2024-10-21', label: '2024-10-21' },
  { value: '2024-08-01-preview', label: '2024-08-01-preview' },
] as const;

/**
 * Azure OpenAI-specific configuration form.
 *
 * Mirrors the SillyTavern `#azure_openai_settings` block with base URL,
 * deployment name, API version, API key, and model selection.
 */
export function AzureOpenAIForm({
  config,
  onConfigChange,
  onManageKeys,
  className,
}: AzureOpenAIFormProps) {
  const [showKey, setShowKey] = useState(false);

  const update = (patch: Partial<AzureOpenAIConfig>) => {
    onConfigChange?.({ ...config, ...patch });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Azure Base URL */}
      <div className="space-y-2">
        <Label>Azure Base URL</Label>
        <Input
          value={config?.baseUrl ?? ''}
          onChange={(e) => update({ baseUrl: e.target.value })}
          placeholder="https://your-resource.openai.azure.com/"
          type="url"
          autoComplete="url"
        />
      </div>

      {/* Deployment Name */}
      <div className="space-y-2">
        <Label>Deployment Name</Label>
        <Input
          value={config?.deploymentName ?? ''}
          onChange={(e) => update({ deploymentName: e.target.value })}
          placeholder="your-deployment-name"
        />
      </div>

      {/* API Version */}
      <div className="space-y-2">
        <Label>API Version</Label>
        <Select
          value={config?.apiVersion ?? '2025-04-01-preview'}
          onValueChange={(v) => update({ apiVersion: v })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select API version" />
          </SelectTrigger>
          <SelectContent>
            {API_VERSIONS.map((v) => (
              <SelectItem key={v.value} value={v.value}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Azure API Key */}
      <div className="space-y-2">
        <Label>Azure API Key</Label>
        <div className="flex items-center gap-2">
          <Input
            value={config?.apiKey ?? ''}
            onChange={(e) => update({ apiKey: e.target.value })}
            placeholder="Enter your Azure API key"
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
            onClick={onManageKeys}
            aria-label="Manage API keys"
            title="Manage API keys"
          >
            <KeyRound className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-muted-foreground/60 text-[12px]">
          For privacy reasons, your key is stored locally and never sent to third parties.
        </p>
      </div>

      {/* Model Name */}
      <div className="space-y-2">
        <Label>Model Name</Label>
        <Select value={config?.model ?? ''} onValueChange={(v) => update({ model: v })}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Click 'Connect' to fetch model name" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__placeholder__" disabled>
              Click &quot;Connect&quot; to fetch model name
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-muted-foreground/60 text-[12px]">
          The underlying model of your deployment. This is detected automatically when you connect.
        </p>
      </div>
    </div>
  );
}
