import { useCallback, useMemo, useState } from 'react';
import { Eye, EyeOff, ExternalLink, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OnlineStatus } from './OnlineStatus';
import { ModelSelector } from './ModelSelector';
import { cn } from '@/lib/utils';
import { ALL_PROVIDERS } from './providerConfigs';

// ── Types ──────────────────────────────────────────────────────────────

export interface ProviderField {
  type: 'text' | 'password' | 'select' | 'checkbox' | 'url' | 'number' | 'textarea';
  key: string;
  label: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: string | boolean | number;
  helpText?: string;
  link?: { text: string; url: string };
  optional?: boolean;
}

export interface ProviderFormProps {
  /** Provider source id — enables auto-lookup of config from providerConfigs. */
  subType?: string;
  /** Active source id (used alongside subType). */
  activeSource?: string;
  /** Provider display name shown in the header. */
  name?: string;
  /** Dynamic field definitions for this provider. */
  fields?: ProviderField[];
  /** Show a ModelSelector dropdown (fetches models from the backend). */
  showModelSelector?: boolean;
  /** Model source id for the ModelSelector (defaults to the provider id). */
  modelSource?: string;
  /** Show a URL input (for local/self-hosted providers). */
  showUrl?: boolean;
  /** Placeholder for the URL input. */
  urlPlaceholder?: string;
  /** Label for the connect button. */
  connectLabel?: string;
  /** Called when the user clicks "Connect". Receives all form values. */
  onConnect?: (data: Record<string, string | boolean | number>) => void;
  /** Called when the user clicks "Cancel". */
  onCancel?: () => void;
  /** Whether the provider is currently connected (drives OnlineStatus + Cancel visibility). */
  connected?: boolean;
  /** Additional class names. */
  className?: string;
  /** Initial value for the URL field. */
  url?: string;
  /** Called when the URL field changes. */
  onUrlChange?: (url: string) => void;
  /** Initial value for the model field. */
  model?: string;
  /** Called when the model changes. */
  onModelChange?: (model: string) => void;
  /** Show reverse proxy section (caller should gate by source). */
  showReverseProxy?: boolean;
  /** Children rendered between the fields and the action buttons. */
  children?: React.ReactNode;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function fieldDefaults(fields: ProviderField[]): Record<string, string | boolean | number> {
  const out: Record<string, string | boolean | number> = {};
  for (const f of fields) {
    if (f.defaultValue !== undefined) {
      out[f.key] = f.defaultValue;
    } else if (f.type === 'checkbox') {
      out[f.key] = false;
    } else {
      out[f.key] = '';
    }
  }
  return out;
}

// ── Field renderer ──────────────────────────────────────────────────────

function FormField({
  field,
  value,
  onChange,
}: {
  field: ProviderField;
  value: string | boolean | number;
  onChange: (key: string, val: string | boolean | number) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  // ── Password field with peek toggle ──
  if (field.type === 'password') {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="gap-1.5">
            <Key className="text-muted-foreground/60 h-3.5 w-3.5" />
            {field.label}
            {field.optional && (
              <span className="text-muted-foreground/40 ml-1 text-xs font-normal">(optional)</span>
            )}
          </Label>
          {field.link && (
            <a
              href={field.link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/50 hover:text-foreground/80 mono-tag inline-flex items-center gap-1 text-[11px] transition-colors"
            >
              {field.link.text}
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            autoComplete="off"
            className="flex-1 font-mono text-[13px]"
          />
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        </div>
        {field.helpText && (
          <p className="text-muted-foreground/50 mono-tag text-[11px]">{field.helpText}</p>
        )}
      </div>
    );
  }

  // ── Select field ──
  if (field.type === 'select') {
    return (
      <div className="space-y-2">
        <Label>
          {field.label}
          {field.optional && (
            <span className="text-muted-foreground/40 ml-1 text-xs font-normal">(optional)</span>
          )}
        </Label>
        <Select
          value={typeof value === 'string' ? value : undefined}
          onValueChange={(v) => onChange(field.key, v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={field.placeholder ?? `Select ${field.label}...`} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {field.helpText && (
          <p className="text-muted-foreground/50 mono-tag text-[11px]">{field.helpText}</p>
        )}
      </div>
    );
  }

  // ── Checkbox ──
  if (field.type === 'checkbox') {
    return (
      <label className="group flex cursor-pointer items-center gap-3 py-1">
        <input
          type="checkbox"
          checked={typeof value === 'boolean' ? value : false}
          onChange={(e) => onChange(field.key, e.target.checked)}
          className="border-input accent-primary h-4 w-4 rounded bg-transparent"
        />
        <span className="text-foreground/80 group-hover:text-foreground text-sm transition-colors">
          {field.label}
        </span>
      </label>
    );
  }

  // ── Textarea ──
  if (field.type === 'textarea') {
    return (
      <div className="space-y-2">
        <Label>
          {field.label}
          {field.optional && (
            <span className="text-muted-foreground/40 ml-1 text-xs font-normal">(optional)</span>
          )}
        </Label>
        <Textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          rows={3}
        />
        {field.helpText && (
          <p className="text-muted-foreground/50 mono-tag text-[11px]">{field.helpText}</p>
        )}
      </div>
    );
  }

  // ── Number ──
  if (field.type === 'number') {
    return (
      <div className="space-y-2">
        <Label>
          {field.label}
          {field.optional && (
            <span className="text-muted-foreground/40 ml-1 text-xs font-normal">(optional)</span>
          )}
        </Label>
        <Input
          type="number"
          value={typeof value === 'number' ? value : typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(field.key, Number(e.target.value))}
          placeholder={field.placeholder}
          min={0}
        />
        {field.helpText && (
          <p className="text-muted-foreground/50 mono-tag text-[11px]">{field.helpText}</p>
        )}
      </div>
    );
  }

  // ── URL (same as text but with url type) ──
  // ── Text (default) ──
  return (
    <div className="space-y-2">
      <Label>
        {field.label}
        {field.optional && (
          <span className="text-muted-foreground/40 ml-1 text-xs font-normal">(optional)</span>
        )}
      </Label>
      <Input
        type={field.type === 'url' ? 'url' : 'text'}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(field.key, e.target.value)}
        placeholder={field.placeholder}
        autoComplete="off"
      />
      {field.link && (
        <a
          href={field.link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground/50 hover:text-foreground/80 mono-tag inline-flex items-center gap-1 text-[11px] transition-colors"
        >
          {field.link.text}
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
      )}
      {field.helpText && (
        <p className="text-muted-foreground/50 mono-tag text-[11px]">{field.helpText}</p>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────

export function ProviderForm({
  subType,
  activeSource,
  name: nameProp,
  fields: fieldsProp,
  showModelSelector: showModelSelectorProp,
  modelSource,
  showUrl: showUrlProp,
  urlPlaceholder: urlPlaceholderProp,
  connectLabel: connectLabelProp,
  onConnect,
  onCancel,
  connected = false,
  className,
  url: urlProp,
  onUrlChange,
  model: modelProp,
  onModelChange,
  children,
}: ProviderFormProps) {
  const resolved = useMemo(() => {
    if (!subType) return null;
    const cfg = ALL_PROVIDERS[subType];
    if (!cfg) return null;
    return {
      name: cfg.name,
      fields: cfg.fields,
      showModelSelector: cfg.showModelSelector ?? false,
      showUrl: cfg.showUrl ?? false,
      urlPlaceholder: cfg.urlPlaceholder,
      connectLabel: cfg.connectLabel ?? 'Connect',
    };
  }, [subType]);

  const name = nameProp ?? resolved?.name ?? subType ?? 'Provider';
  const fields = fieldsProp ?? resolved?.fields ?? [];
  const showModelSelector = showModelSelectorProp ?? resolved?.showModelSelector ?? false;
  const showUrl = showUrlProp ?? resolved?.showUrl ?? false;
  const urlPlaceholder =
    urlPlaceholderProp ?? resolved?.urlPlaceholder ?? 'http://localhost:8080/v1';
  const connectLabel = connectLabelProp ?? resolved?.connectLabel ?? 'Connect';

  const effectiveSource = subType ?? activeSource ?? 'generic';
  // Field state (controlled externally via props if needed, or internal defaults)
  const [fieldValues, setFieldValues] = useState(() => fieldDefaults(fields));

  const setField = useCallback((key: string, val: string | boolean | number) => {
    setFieldValues((prev) => ({ ...prev, [key]: val }));
  }, []);

  // Internal URL / model state for fields not managed externally
  const [internalUrl, setInternalUrl] = useState('');
  const [internalModel, setInternalModel] = useState('');

  const url = urlProp ?? internalUrl;
  const setUrl = onUrlChange ?? setInternalUrl;
  const model = modelProp ?? internalModel;
  const setModel = onModelChange ?? setInternalModel;

  const handleConnect = useCallback(() => {
    onConnect?.({ ...fieldValues, _url: url, _model: model });
  }, [fieldValues, url, model, onConnect]);

  return (
    <div className={cn('space-y-5', className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="border-border bg-muted/40 flex h-9 w-9 items-center justify-center rounded-md border">
          <span className="display-host text-ember text-sm">{name.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <h3 className="display-host text-base leading-none">{name}</h3>
          <p className="text-muted-foreground/50 mono-tag mt-0.5 text-[11px]">
            {connected ? 'active connection' : 'configure to connect'}
          </p>
        </div>
      </div>

      {/* Dynamic fields */}
      {fields.map((field) => (
        <FormField
          key={field.key}
          field={field}
          value={fieldValues[field.key] ?? ''}
          onChange={setField}
        />
      ))}

      {/* URL field */}
      {showUrl && (
        <div className="space-y-2">
          <Label>Server URL</Label>
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={urlPlaceholder}
            autoComplete="url"
            className="font-mono text-[13px]"
          />
        </div>
      )}

      {/* Model selector */}
      {showModelSelector && (
        <div className="space-y-2">
          <Label>Model</Label>
          <ModelSelector
            source={modelSource ?? effectiveSource}
            value={model}
            onChange={setModel}
          />
        </div>
      )}

      {/* Optional children slot (for ReverseProxySection, extra options, etc.) */}
      {children}

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          type="button"
          onClick={handleConnect}
          className={cn('relative h-9 pr-5 pl-4', !connected && 'ember-pulse')}
        >
          <span className="text-[13px] font-semibold tracking-tight">{connectLabel}</span>
        </Button>
        {connected && onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="h-9">
            <span className="text-[13px]">Cancel</span>
          </Button>
        )}
      </div>

      {/* Status indicator */}
      <OnlineStatus connected={connected} />
    </div>
  );
}
