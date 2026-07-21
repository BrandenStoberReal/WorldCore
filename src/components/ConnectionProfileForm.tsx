// Used in modals for profile CRUD (create/edit). Not a standalone panel.
import { useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConnectionProfile } from '@/shared/schemas/connection-profile';
import { SHARED_CONST } from '@/shared/constants';

interface ConnectionProfileFormProps {
  profile?: ConnectionProfile;
  onSave: (profile: ConnectionProfile) => void;
  onCancel: () => void;
}

const EMPTY_FORM: Omit<ConnectionProfile, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  api: 'openai',
  model: '',
  apiUrl: '',
  secretId: '',
  preset: '',
  instruct: '',
  context: '',
  sysprompt: '',
  syspromptState: true,
  instructState: false,
  stopStrings: '',
  startReplyWith: '',
  reasoningTemplate: '',
  promptPostProcessing: '',
  tokenizer: 'cl100k_base',
  proxy: '',
  regexPreset: '',
  exclude: [],
};

const EXCLUDE_OPTIONS = [
  'preset',
  'instruct',
  'context',
  'sysprompt',
  'max_tokens',
  'temperature',
  'top_p',
  'top_k',
  'rep_pen',
  'frequency_penalty',
  'presence_penalty',
  'stop',
  'seed',
  'stream',
] as const;

const TOKENIZER_OPTIONS = ['gpt2', 'cl100k_base', 'p50k_base', 'p50k_edit', 'r50k_base'] as const;

/** Group heading for a collapsible form section */
function SectionHeader({
  label,
  number,
  open,
  onToggle,
}: {
  label: string;
  number: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="group/section flex w-full items-center justify-between py-2"
    >
      <div className="flex items-center gap-2">
        <span className="mono-tag text-ember text-[11px]">{number}</span>
        <span className="bg-ember/30 h-px w-6" />
        <span className="text-foreground/80 text-[13px] font-semibold tracking-tight">{label}</span>
      </div>
      <ChevronDown
        className={cn(
          'text-muted-foreground/50 group-hover/section:text-ember h-3.5 w-3.5 transition-transform duration-200',
          open && 'rotate-180',
        )}
      />
    </button>
  );
}

export function ConnectionProfileForm({ profile, onSave, onCancel }: ConnectionProfileFormProps) {
  const isEdit = !!profile;
  const [form, setForm] = useState(() => {
    if (profile) {
      return { ...EMPTY_FORM, ...profile };
    }
    return { ...EMPTY_FORM };
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Collapsible sections
  const [openSections, setOpenSections] = useState({
    basic: true,
    connection: true,
    presets: false,
    sysprompt: false,
    generation: false,
    advanced: false,
    exclude: false,
  });

  const toggleSection = useCallback((key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const updateField = useCallback(
    <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const toggleExclude = useCallback((item: string) => {
    setForm((prev) => {
      const current = prev.exclude ?? [];
      const next = current.includes(item) ? current.filter((e) => e !== item) : [...current, item];
      return { ...prev, exclude: next };
    });
  }, []);

  const handleSubmit = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        const result: ConnectionProfile = {
          ...form,
          id: profile?.id ?? crypto.randomUUID(),
          createdAt: profile?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        onSave(result);
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, profile, onSave],
  );

  const canSubmit = form.name.trim().length > 0 && form.api.length > 0 && !isSubmitting;

  return (
    <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
      {/* ── Basic ── */}
      <Card className="border-border/60 overflow-hidden rounded-sm py-0">
        <CardContent className="px-4 py-0">
          <SectionHeader
            label="Basic"
            number="[01]"
            open={openSections.basic}
            onToggle={() => toggleSection('basic')}
          />
        </CardContent>
        <div className={cn('accordion-content', openSections.basic && 'accordion-open')}>
          <CardContent className="border-border/40 space-y-3 border-t px-4 pt-0 pb-4 md:px-5">
            <div className="space-y-2 pt-3">
              <Label>
                Profile Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="My connection profile"
              />
            </div>
            <div className="space-y-2">
              <Label>
                API Type <span className="text-destructive">*</span>
              </Label>
              <Select value={form.api} onValueChange={(val) => updateField('api', val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select API type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectLabel>Chat Completions</SelectLabel>
                  {SHARED_CONST.CHAT_COMPLETION_SOURCES.map((src) => (
                    <SelectItem key={src} value={src}>
                      {src}
                    </SelectItem>
                  ))}
                  <SelectLabel>Text Completions</SelectLabel>
                  {SHARED_CONST.TEXT_COMPLETION_SOURCES.map((src) => (
                    <SelectItem key={src} value={src}>
                      {src}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* ── Connection ── */}
      <Card className="border-border/60 overflow-hidden rounded-sm py-0">
        <CardContent className="px-4 py-0">
          <SectionHeader
            label="Connection"
            number="[02]"
            open={openSections.connection}
            onToggle={() => toggleSection('connection')}
          />
        </CardContent>
        <div className={cn('accordion-content', openSections.connection && 'accordion-open')}>
          <CardContent className="border-border/40 space-y-3 border-t px-4 pt-0 pb-4 md:px-5">
            <div className="space-y-2 pt-3">
              <Label>Model</Label>
              <Input
                value={form.model}
                onChange={(e) => updateField('model', e.target.value)}
                placeholder="gpt-4o, claude-3-opus, etc."
              />
            </div>
            <div className="space-y-2">
              <Label>API URL</Label>
              <Input
                value={form.apiUrl ?? ''}
                onChange={(e) => updateField('apiUrl', e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
            </div>
            <div className="space-y-2">
              <Label>Secret / API Key Reference</Label>
              <Input
                value={form.secretId ?? ''}
                onChange={(e) => updateField('secretId', e.target.value)}
                placeholder="Secret key ID"
              />
            </div>
          </CardContent>
        </div>
      </Card>

      {/* ── Presets & Templates ── */}
      <Card className="border-border/60 overflow-hidden rounded-sm py-0">
        <CardContent className="px-4 py-0">
          <SectionHeader
            label="Presets & Templates"
            number="[03]"
            open={openSections.presets}
            onToggle={() => toggleSection('presets')}
          />
        </CardContent>
        <div className={cn('accordion-content', openSections.presets && 'accordion-open')}>
          <CardContent className="border-border/40 space-y-3 border-t px-4 pt-0 pb-4 md:px-5">
            <div className="space-y-2 pt-3">
              <Label>Preset Name</Label>
              <Input
                value={form.preset ?? ''}
                onChange={(e) => updateField('preset', e.target.value)}
                placeholder="Generation preset name"
              />
            </div>
            <div className="space-y-2">
              <Label>Instruct Template</Label>
              <Input
                value={form.instruct ?? ''}
                onChange={(e) => updateField('instruct', e.target.value)}
                placeholder="Instruct template name"
              />
            </div>
            <div className="space-y-2">
              <Label>Context Template</Label>
              <Input
                value={form.context ?? ''}
                onChange={(e) => updateField('context', e.target.value)}
                placeholder="Context template name"
              />
            </div>
          </CardContent>
        </div>
      </Card>

      {/* ── System Prompt ── */}
      <Card className="border-border/60 overflow-hidden rounded-sm py-0">
        <CardContent className="px-4 py-0">
          <SectionHeader
            label="System Prompt"
            number="[04]"
            open={openSections.sysprompt}
            onToggle={() => toggleSection('sysprompt')}
          />
        </CardContent>
        <div className={cn('accordion-content', openSections.sysprompt && 'accordion-open')}>
          <CardContent className="border-border/40 space-y-3 border-t px-4 pt-0 pb-4 md:px-5">
            <div className="space-y-2 pt-3">
              <Label>System Prompt Name</Label>
              <Input
                value={form.sysprompt ?? ''}
                onChange={(e) => updateField('sysprompt', e.target.value)}
                placeholder="System prompt name"
              />
            </div>
            <div className="flex items-center gap-3">
              <Label className="flex-1">System Prompt Enabled</Label>
              <button
                type="button"
                role="switch"
                aria-checked={!!(form.syspromptState ?? true)}
                onClick={() => updateField('syspromptState', !(form.syspromptState ?? true))}
                className={cn(
                  'border-border relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors',
                  (form.syspromptState ?? true)
                    ? 'bg-ember border-ember/60'
                    : 'bg-muted border-border',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
                    (form.syspromptState ?? true) ? 'translate-x-4' : 'translate-x-0.5',
                  )}
                />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Label className="flex-1">Instruct Mode</Label>
              <button
                type="button"
                role="switch"
                aria-checked={!!(form.instructState ?? false)}
                onClick={() => updateField('instructState', !(form.instructState ?? false))}
                className={cn(
                  'border-border relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors',
                  (form.instructState ?? false)
                    ? 'bg-ember border-ember/60'
                    : 'bg-muted border-border',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
                    (form.instructState ?? false) ? 'translate-x-4' : 'translate-x-0.5',
                  )}
                />
              </button>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* ── Generation ── */}
      <Card className="border-border/60 overflow-hidden rounded-sm py-0">
        <CardContent className="px-4 py-0">
          <SectionHeader
            label="Generation"
            number="[05]"
            open={openSections.generation}
            onToggle={() => toggleSection('generation')}
          />
        </CardContent>
        <div className={cn('accordion-content', openSections.generation && 'accordion-open')}>
          <CardContent className="border-border/40 space-y-3 border-t px-4 pt-0 pb-4 md:px-5">
            <div className="space-y-2 pt-3">
              <Label>Stop Strings</Label>
              <Textarea
                value={form.stopStrings ?? ''}
                onChange={(e) => updateField('stopStrings', e.target.value)}
                placeholder="Comma-separated stop strings"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Start Reply With</Label>
              <Input
                value={form.startReplyWith ?? ''}
                onChange={(e) => updateField('startReplyWith', e.target.value)}
                placeholder="Text to prepend to assistant reply"
              />
            </div>
            <div className="space-y-2">
              <Label>Reasoning Template</Label>
              <Input
                value={form.reasoningTemplate ?? ''}
                onChange={(e) => updateField('reasoningTemplate', e.target.value)}
                placeholder="Reasoning template name"
              />
            </div>
          </CardContent>
        </div>
      </Card>

      {/* ── Advanced ── */}
      <Card className="border-border/60 overflow-hidden rounded-sm py-0">
        <CardContent className="px-4 py-0">
          <SectionHeader
            label="Advanced"
            number="[06]"
            open={openSections.advanced}
            onToggle={() => toggleSection('advanced')}
          />
        </CardContent>
        <div className={cn('accordion-content', openSections.advanced && 'accordion-open')}>
          <CardContent className="border-border/40 space-y-3 border-t px-4 pt-0 pb-4 md:px-5">
            <div className="space-y-2 pt-3">
              <Label>Tokenizer</Label>
              <Select
                value={form.tokenizer ?? 'cl100k_base'}
                onValueChange={(val) => updateField('tokenizer', val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select tokenizer" />
                </SelectTrigger>
                <SelectContent>
                  {TOKENIZER_OPTIONS.map((tok) => (
                    <SelectItem key={tok} value={tok}>
                      {tok}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Proxy</Label>
              <Input
                value={form.proxy ?? ''}
                onChange={(e) => updateField('proxy', e.target.value)}
                placeholder="Proxy preset name"
              />
            </div>
            <div className="space-y-2">
              <Label>Regex Preset</Label>
              <Input
                value={form.regexPreset ?? ''}
                onChange={(e) => updateField('regexPreset', e.target.value)}
                placeholder="Regex preset ID"
              />
            </div>
            <div className="space-y-2">
              <Label>Prompt Post Processing</Label>
              <Input
                value={form.promptPostProcessing ?? ''}
                onChange={(e) => updateField('promptPostProcessing', e.target.value)}
                placeholder="Post-processing method"
              />
            </div>
          </CardContent>
        </div>
      </Card>

      {/* ── Exclude ── */}
      <Card className="border-border/60 overflow-hidden rounded-sm py-0">
        <CardContent className="px-4 py-0">
          <SectionHeader
            label="Exclude from Profile"
            number="[07]"
            open={openSections.exclude}
            onToggle={() => toggleSection('exclude')}
          />
        </CardContent>
        <div className={cn('accordion-content', openSections.exclude && 'accordion-open')}>
          <CardContent className="border-border/40 border-t px-4 pt-0 pb-4">
            <p className="text-muted-foreground/55 mt-3 mb-3 text-[12px]">
              Toggle settings to exclude from this profile
            </p>
            <div className="flex flex-wrap gap-2">
              {EXCLUDE_OPTIONS.map((item) => {
                const active = form.exclude?.includes(item) ?? false;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleExclude(item)}
                    className={cn(
                      'mono-tag rounded-sm border px-2 py-1 text-[12px] transition-all',
                      active
                        ? 'bg-ember/15 border-ember/40 text-ember'
                        : 'bg-muted/50 border-border/60 text-foreground/50 hover:border-ember/20 hover:text-foreground/70',
                    )}
                  >
                    {active ? '✓ ' : ''}
                    {item}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </div>
      </Card>

      {/* ── Actions ── */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isEdit ? 'Saving...' : 'Creating...'}
            </>
          ) : (
            <>{isEdit ? 'Save Changes' : 'Create Profile'}</>
          )}
        </Button>
      </div>
    </form>
  );
}
