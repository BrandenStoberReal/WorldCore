import { useCallback, useState } from 'react';
import { ExternalLink, HelpCircle, Key, Plug, X } from 'lucide-react';
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
import { OnlineStatus } from './OnlineStatus';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NovelAIFormProps {
  onConnect?: (config: Record<string, unknown>) => void;
  connected?: boolean;
}

const NOVELAI_MODELS = [
  { value: 'clio-v1', label: 'Clio' },
  { value: 'kayra-v1', label: 'Kayra' },
  { value: 'llama-3-erato-v1', label: 'Erato' },
] as const;

const DOCS_URL = 'https://docs.sillytavern.app/usage/api-connections/novelai/';
const MODELS_DOCS_URL = 'https://docs.sillytavern.app/usage/api-connections/novelai/#models';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NovelAIForm({ onConnect, connected = false }: NovelAIFormProps) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('kayra-v1');
  const [connecting, setConnecting] = useState(false);

  const handleConnect = useCallback(() => {
    setConnecting(true);
    onConnect?.({
      type: 'novel',
      apiKey,
      model,
    });
  }, [apiKey, model, onConnect]);

  const handleCancel = useCallback(() => {
    setConnecting(false);
  }, []);

  return (
    <div className="space-y-5">
      {/* Instructions */}
      <div className="text-muted-foreground space-y-2 text-sm">
        <ol className="list-inside list-decimal space-y-1">
          <li>
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex items-center gap-1 hover:underline"
            >
              Get your NovelAI API Key
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </li>
          <li>Enter it in the box below:</li>
        </ol>
      </div>

      {/* API Key */}
      <div className="space-y-2">
        <Label>Novel API Key</Label>
        <div className="flex items-center gap-2">
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter NovelAI API key"
            className="flex-1"
            autoComplete="off"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Manage API keys"
            aria-label="Manage API keys"
          >
            <Key className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-muted-foreground/70 text-xs italic">
          For privacy reasons, your API key will be hidden after you click &quot;Connect&quot;.
        </p>
      </div>

      {/* Model selector */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label>Novel AI Model</Label>
          <a
            href={MODELS_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            title="Model documentation"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </a>
        </div>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {NOVELAI_MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
