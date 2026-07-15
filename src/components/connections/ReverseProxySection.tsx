import { useState } from 'react';
import { ChevronDown, Eye, EyeOff, KeyRound } from 'lucide-react';
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

interface ReverseProxySectionProps {
  /** Only render when true (caller gates by source). */
  visible: boolean;
  /** Currently selected proxy preset id. */
  preset?: string;
  /** Called when the preset changes. */
  onPresetChange?: (preset: string) => void;
  /** Available proxy presets. */
  presets?: ProxyPreset[];
  /** Proxy display name. */
  name?: string;
  onNameChange?: (name: string) => void;
  /** Proxy server URL. */
  url?: string;
  onUrlChange?: (url: string) => void;
  /** Proxy password / auth header. */
  password?: string;
  onPasswordChange?: (password: string) => void;
  /** Default open state. */
  defaultOpen?: boolean;
  className?: string;
}

export interface ProxyPreset {
  value: string;
  label: string;
}

const DEFAULT_PRESETS: ProxyPreset[] = [
  { value: 'none', label: 'None' },
  { value: 'custom', label: 'Custom' },
];

/**
 * Collapsible "Reverse Proxy" section.
 *
 * Mirrors the SillyTavern `inline-drawer` block with `data-source` filtering.
 * The caller is responsible for passing `visible` based on whether the active
 * source supports reverse proxy (openai, claude, mistralai, makersuite,
 * vertexai, deepseek, xai, zai, moonshot, ...).
 */
export function ReverseProxySection({
  visible,
  preset,
  onPresetChange,
  presets = DEFAULT_PRESETS,
  name,
  onNameChange,
  url,
  onUrlChange,
  password,
  onPasswordChange,
  defaultOpen = false,
  className,
}: ReverseProxySectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [showPassword, setShowPassword] = useState(false);

  if (!visible) return null;

  return (
    <div className={cn('border-border/60 bg-muted/20 rounded-md border', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="hover:bg-accent/50 flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors"
      >
        <span className="flex items-center gap-2">
          <KeyRound className="text-muted-foreground/60 h-3.5 w-3.5" />
          Reverse Proxy
        </span>
        <ChevronDown
          className={cn(
            'text-muted-foreground/50 h-4 w-4 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="border-border/40 space-y-3 border-t px-3 pt-1 pb-3">
          {/* Proxy Preset */}
          <div className="space-y-2 pt-2">
            <Label>Proxy Preset</Label>
            <Select value={preset ?? 'none'} onValueChange={(v) => onPresetChange?.(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a preset" />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Proxy Name */}
          <div className="space-y-2">
            <Label>Proxy Name</Label>
            <Input
              value={name ?? ''}
              onChange={(e) => onNameChange?.(e.target.value)}
              placeholder="My proxy"
            />
          </div>

          {/* Proxy Server URL */}
          <div className="space-y-2">
            <Label>Proxy Server URL</Label>
            <Input
              value={url ?? ''}
              onChange={(e) => onUrlChange?.(e.target.value)}
              placeholder="https://your-proxy.example.com/v1"
              type="url"
              autoComplete="url"
            />
          </div>

          {/* Proxy Password */}
          <div className="space-y-2">
            <Label>Proxy Password</Label>
            <div className="flex items-center gap-2">
              <Input
                value={password ?? ''}
                onChange={(e) => onPasswordChange?.(e.target.value)}
                placeholder="sk-..."
                type={showPassword ? 'text' : 'password'}
                autoComplete="off"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
