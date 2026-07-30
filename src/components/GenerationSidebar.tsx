import { useCallback, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, RotateCcw, Zap, Copy, PanelLeftClose, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppStore, useGenerationStore } from '@/lib/stores';
import { GenerationSlider } from '@/components/GenerationSlider';
import { InlineSection } from '@/components/drawers/InlineSection';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { PanelHeader } from '@/components/ui/panel-header';
import { IconButton } from '@/components/ui/icon-button';
import { apiPost } from '@/lib/api';

interface GenerationSidebarProps {
  mode?: 'sidebar' | 'drawer';
  onToggle?: () => void;
}

type PresetStatus = 'idle' | 'saving' | 'loading' | 'ok' | 'err';

function parseSillyTavernGenerationPreset(
  json: Record<string, unknown>,
): Partial<ReturnType<typeof useGenerationStore.getState>> | null {
  const tgSettings = json.textgenerationwebui_settings as Record<string, unknown> | undefined;
  const source = tgSettings ?? json;

  if (typeof source !== 'object' || source === null) return null;

  const params: Record<string, unknown> = {};

  const fieldMap: Record<string, string> = {
    temp: 'temperature',
    freq_pen: 'frequency_penalty',
    presence_pen: 'presence_penalty',
  };

  const numericKeys = [
    'temperature', 'top_p', 'top_k', 'max_tokens', 'seed',
    'frequency_penalty', 'presence_penalty', 'min_tokens',
    'min_p', 'typical_p', 'top_a', 'tfs',
    'rep_pen', 'rep_pen_range', 'rep_pen_slope',
    'dry_multiplier', 'dry_base', 'dry_allowed_length',
    'mirostat_mode', 'mirostat_tau', 'mirostat_eta',
    'smoothing_factor', 'epsilon_cutoff', 'eta_cutoff',
  ];

  for (const key of numericKeys) {
    if (key in source) {
      const val = source[key];
      if (typeof val === 'number') params[key] = val;
    }
  }

  for (const [alias, canonical] of Object.entries(fieldMap)) {
    if (alias in source && !(canonical in params)) {
      const val = source[alias];
      if (typeof val === 'number') params[canonical] = val;
    }
  }

  if ('stop' in source && Array.isArray(source.stop)) {
    params.stop = source.stop;
  } else if ('stopping_strings' in source && Array.isArray(source.stopping_strings)) {
    params.stop = source.stopping_strings;
  }

  if (Object.keys(params).length === 0) return null;

  return params as Partial<ReturnType<typeof useGenerationStore.getState>>;
}

const MASTER_SECTION_KEYS = ['instruct', 'context', 'sysprompt', 'preset', 'reasoning'] as const;

const MASTER_SECTION_CATEGORY: Record<string, string> = {
  preset: 'generation',
  instruct: 'instruct',
  context: 'context',
  sysprompt: 'sysprompt',
  reasoning: 'reasoning',
};

export function GenerationSidebar({ mode: _mode = 'sidebar', onToggle }: GenerationSidebarProps) {
  const store = useGenerationStore();
  const { mode } = store;
  const { streamingEnabled, setStreamingEnabled } = useAppStore();
  const [presetStatus, setPresetStatus] = useState<PresetStatus>('idle');
  const [presetMessage, setPresetMessage] = useState<string>('');
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: presetNames = [] } = useQuery<string[]>({
    queryKey: ['/api/v1/presets/all', 'generation+textgenerationwebui'],
    queryFn: async () => {
      const [genPresets, tgPresets] = await Promise.all([
        apiPost<Array<{ data?: { name?: string } }>>('/presets/all', { category: 'generation' }),
        apiPost<Array<{ data?: { name?: string } }>>('/presets/all', {
          category: 'textgenerationwebui',
        }),
      ]);
      const names = new Set<string>();
      for (const p of [...genPresets, ...tgPresets]) {
        const name = (p.data?.name as string) ?? '';
        if (name) names.add(name);
      }
      return [...names].sort();
    },
  });

  const { data: generationPresetNames = [] } = useQuery<string[]>({
    queryKey: ['/api/v1/presets/all', 'generation-only'],
    queryFn: async () => {
      const genPresets = await apiPost<Array<{ data?: { name?: string } }>>('/presets/all', {
        category: 'generation',
      });
      const names = new Set<string>();
      for (const p of genPresets) {
        const name = (p.data?.name as string) ?? '';
        if (name) names.add(name);
      }
      return [...names].sort();
    },
  });

  const { data: defaultPresets = new Set<string>() } = useQuery({
    queryKey: ['/api/v1/presets/all', 'defaults'],
    queryFn: async () => {
      const categories = ['generation', 'textgenerationwebui', 'instruct', 'context', 'sysprompt', 'reasoning'];
      const results = await Promise.all(
        categories.map((cat) =>
          apiPost<Array<{ data?: { name?: string }; isDefault?: boolean }>>('/presets/all', {
            category: cat,
          }),
        ),
      );
      const defaults = new Set<string>();
      for (const presets of results) {
        for (const p of presets) {
          if (p.isDefault) {
            const name = (p.data?.name as string) ?? '';
            if (name) defaults.add(name);
          }
        }
      }
      return defaults;
    },
  });

  const flashStatus = (status: PresetStatus, message: string) => {
    setPresetStatus(status);
    setPresetMessage(message);
    window.setTimeout(() => {
      setPresetStatus('idle');
      setPresetMessage('');
    }, 2000);
  };

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const text = event.target?.result;
          if (typeof text !== 'string') {
            toast.error('Failed to read file contents');
            return;
          }
          const json = JSON.parse(text) as Record<string, unknown>;

          // Detect master preset: 2+ known section keys at top level
          const detectedSections = MASTER_SECTION_KEYS.filter(
            (key) => key in json && typeof json[key] === 'object' && json[key] !== null,
          );

          if (detectedSections.length >= 2) {
            const baseName = file.name.replace(/\.json$/i, '') || 'Imported';
            const imported: string[] = [];

            for (const section of detectedSections) {
              const sectionData = json[section] as Record<string, unknown>;
              const category = MASTER_SECTION_CATEGORY[section];
              if (!category) continue;

              if (section === 'preset') {
                const parsed = parseSillyTavernGenerationPreset(sectionData);
                if (parsed) {
                  store.loadPreset(parsed);

                  const existingNames = new Set([...presetNames, ...defaultPresets]);
                  let uniqueName = baseName;
                  let counter = 1;
                  while (existingNames.has(uniqueName)) {
                    uniqueName = `${baseName} (${counter})`;
                    counter++;
                  }

                  await apiPost('/presets/import', {
                    preset: {
                      category: 'generation',
                      data: { name: uniqueName, ...parsed },
                    },
                  });

                  imported.push(`generation preset "${uniqueName}"`);
                }
              } else {
                const rawName = (sectionData.name as string) || `${baseName} ${section}`;
                const existingNames = new Set([...defaultPresets]);
                let uniqueName = rawName;
                let counter = 1;
                while (existingNames.has(uniqueName)) {
                  uniqueName = `${rawName} (${counter})`;
                  counter++;
                }
                await apiPost('/presets/import', {
                  preset: {
                    category,
                    data: { ...sectionData, name: uniqueName },
                  },
                });
                imported.push(`${section} template`);
              }
            }

            await queryClient.invalidateQueries({ queryKey: ['/api/v1/presets/all'] });

            if (imported.length > 0) {
              toast.success(`Master preset imported: ${imported.join(', ')}`);
            } else {
              toast.error('No importable sections found in master preset');
            }
            return;
          }

          const parsed = parseSillyTavernGenerationPreset(json);
          if (!parsed) {
            toast.error('No generation parameters found in file');
            return;
          }

          store.loadPreset(parsed);

          const baseName = file.name.replace(/\.json$/i, '') || 'Imported';
          const existingNames = new Set([...generationPresetNames, ...defaultPresets]);
          let uniqueName = baseName;
          let counter = 1;
          while (existingNames.has(uniqueName)) {
            uniqueName = `${baseName} (${counter})`;
            counter++;
          }

          useGenerationStore.getState().updateParam('preset', uniqueName);

          await apiPost('/presets/import', {
            preset: {
              category: 'generation',
              data: { name: uniqueName, ...parsed },
            },
          });

          await queryClient.invalidateQueries({ queryKey: ['/api/v1/presets/all'] });

          toast.success(`Preset "${uniqueName}" imported`);
        } catch {
          toast.error('Failed to parse JSON file');
        }
      };
      reader.onerror = () => {
        toast.error('Failed to read file');
      };
      reader.readAsText(file);

      e.target.value = '';
    },
    [store, generationPresetNames, defaultPresets, queryClient],
  );

  const isCurrentPresetDefault = defaultPresets.has(store.preset);

  const handleSavePreset = useCallback(async () => {
    const name = saveName.trim();
    if (!name) return;
    if (isCurrentPresetDefault && name === store.preset) {
      flashStatus('err', `Cannot overwrite default preset "${name}". Choose a different name.`);
      return;
    }
    setPresetStatus('saving');
    try {
      await store.savePresetToBackend(name);
      flashStatus('ok', `Saved "${name}"`);
      setSaveName('');
      setShowSaveInput(false);
    } catch (err) {
      flashStatus('err', err instanceof Error ? err.message : String(err));
    }
  }, [store, saveName, isCurrentPresetDefault, flashStatus]);

  const handleClonePreset = useCallback(() => {
    const baseName = (store.preset || 'Preset').replace(/\s*\(\d+\)$/, '');
    const existingNames = new Set(presetNames);
    let cloneName = `${baseName} (1)`;
    let counter = 2;
    while (existingNames.has(cloneName)) {
      cloneName = `${baseName} (${counter})`;
      counter++;
    }
    setSaveName(cloneName);
    setShowSaveInput(true);
  }, [store.preset, presetNames]);

  const handleLoadPreset = useCallback(
    async (name: string) => {
      if (!name) return;
      setPresetStatus('loading');
      try {
        await store.loadPresetFromBackend(name);
        flashStatus('ok', `Loaded "${name}"`);
      } catch (err) {
        flashStatus('err', err instanceof Error ? err.message : String(err));
      }
    },
    [store],
  );

  const update = useCallback(
    <K extends keyof ReturnType<typeof useGenerationStore.getState>>(
      key: K,
      value: ReturnType<typeof useGenerationStore.getState>[K],
    ) => {
      useGenerationStore.getState().updateParam(key, value);
    },
    [],
  );

  return (
    <aside className="generation-sidebar" role="complementary" aria-label="Generation settings">
      <div className="flex h-full flex-col">
        <div className="border-border/40 border-b px-3 pt-3 pb-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <Zap className="text-ember h-3 w-3 shrink-0" strokeWidth={2} />
              <span className="display-host truncate text-[13px] leading-none">Generation</span>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {showSaveInput ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSavePreset();
                      if (e.key === 'Escape') {
                        setShowSaveInput(false);
                        setSaveName('');
                      }
                    }}
                    placeholder={isCurrentPresetDefault ? 'Clone as new name...' : 'Preset name'}
                    className="h-5 w-20 text-[10px]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSavePreset}
                    disabled={!saveName.trim() || presetStatus === 'saving'}
                    className={cn(
                      'text-foreground/40 hover:text-foreground/70 hover:bg-accent/30 rounded-md p-1 transition-colors',
                      'disabled:cursor-not-allowed disabled:opacity-40',
                    )}
                    title="Confirm save"
                  >
                    <Save className="h-2.5 w-2.5" strokeWidth={2} />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleImportClick}
                    disabled={presetStatus === 'saving' || presetStatus === 'loading'}
                    className={cn(
                      'text-foreground/40 hover:text-foreground/70 hover:bg-accent/30 rounded-md p-1 transition-colors',
                      'disabled:cursor-not-allowed disabled:opacity-40',
                    )}
                    title="Import SillyTavern preset"
                    aria-label="Import SillyTavern preset"
                  >
                    <Upload className="h-2.5 w-2.5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={handleClonePreset}
                    disabled={presetStatus === 'saving' || presetStatus === 'loading'}
                    className={cn(
                      'text-foreground/40 hover:text-foreground/70 hover:bg-accent/30 rounded-md p-1 transition-colors',
                      'disabled:cursor-not-allowed disabled:opacity-40',
                    )}
                    title="Clone current preset"
                    aria-label="Clone current preset"
                  >
                    <Copy className="h-2.5 w-2.5" strokeWidth={2} />
                  </button>
                  {!isCurrentPresetDefault && (
                    <button
                      type="button"
                      onClick={() => {
                        setSaveName(store.preset);
                        setShowSaveInput(true);
                      }}
                      disabled={presetStatus === 'saving' || presetStatus === 'loading'}
                      className={cn(
                        'text-foreground/40 hover:text-foreground/70 hover:bg-accent/30 rounded-md p-1 transition-colors',
                        'disabled:cursor-not-allowed disabled:opacity-40',
                      )}
                      title="Overwrite preset"
                      aria-label="Overwrite preset"
                    >
                      <Save className="h-2.5 w-2.5" strokeWidth={2} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => store.resetDefaults()}
                    className="text-foreground/40 hover:text-foreground/70 hover:bg-accent/30 rounded-md p-1 transition-colors"
                    title="Reset to defaults"
                    aria-label="Reset to defaults"
                  >
                    <RotateCcw className="h-2.5 w-2.5" strokeWidth={2} />
                  </button>
                  {onToggle && (
                    <button
                      type="button"
                      onClick={onToggle}
                      className="text-foreground/40 hover:text-foreground/70 hover:bg-accent/30 rounded-md p-1 transition-colors"
                      title="Hide generation options"
                      aria-label="Hide generation options"
                    >
                      <PanelLeftClose className="h-2.5 w-2.5" strokeWidth={2} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          {presetMessage && (
            <div
              role="status"
              aria-live="polite"
              className={cn(
                'mb-1.5 rounded-md px-2 py-0.5 text-[10px] leading-tight',
                presetStatus === 'ok' && 'bg-ember/10 text-ember',
                presetStatus === 'err' && 'bg-destructive/10 text-destructive',
                (presetStatus === 'saving' || presetStatus === 'loading') && 'text-foreground/50',
              )}
            >
              {presetStatus === 'saving' && 'Saving…'}
              {presetStatus === 'loading' && 'Loading…'}
              {(presetStatus === 'ok' || presetStatus === 'err') && presetMessage}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelected}
            className="hidden"
          />
          <div className="mt-2">
            <Select value={store.preset} onValueChange={handleLoadPreset}>
              <SelectTrigger className="h-6 text-[11px]">
                <SelectValue placeholder="Load preset..." />
              </SelectTrigger>
              <SelectContent>
                {presetNames.map((name) => (
                  <SelectItem key={name} value={name} className="text-[11px]">
                    <span className="flex items-center gap-1.5">
                      {name}
                      {defaultPresets.has(name) && (
                        <span className="text-foreground/30 text-[9px]">built-in</span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <InlineSection panelId="generation" sectionId="sampling" title="Sampling" defaultOpen>
            <GenerationSlider
              label="Temperature"
              value={store.temperature}
              min={0}
              max={2.5}
              step={0.01}
              onChange={(v) => update('temperature', v)}
              description="How creative vs focused the output is. Lower = more predictable and repetitive. Higher = more random and surprising."
            />
            <GenerationSlider
              label="Top P"
              value={store.top_p}
              min={0}
              max={1}
              step={0.001}
              onChange={(v) => update('top_p', v)}
              description="Cuts off less likely words. 1.0 = consider everything. 0.5 = only consider the top 50% most likely words. Lower = more focused."
            />
            <GenerationSlider
              label="Top K"
              value={store.top_k}
              min={0}
              max={300}
              step={1}
              onChange={(v) => update('top_k', v)}
              description="Only consider the K most likely next words. 50 = pick from the top 50. 0 = no limit. Lower = more focused, higher = more variety."
            />
            {mode === 'text' && (
              <>
                <GenerationSlider
                  label="Min P"
                  value={store.min_p}
                  min={0}
                  max={1}
                  step={0.001}
                  onChange={(v) => update('min_p', v)}
                  description="Removes tokens below a probability threshold relative to the best option. 0.1 = ignore tokens less than 10% as likely as the top pick."
                />
                <GenerationSlider
                  label="Typical P"
                  value={store.typical_p}
                  min={0}
                  max={1}
                  step={0.001}
                  onChange={(v) => update('typical_p', v)}
                  description="Prefers 'typical' word choices over the most probable ones. Lower = stranger but more interesting. 1.0 = disabled."
                />
                <GenerationSlider
                  label="Top A"
                  value={store.top_a}
                  min={0}
                  max={1}
                  step={0.001}
                  onChange={(v) => update('top_a', v)}
                  description="Keeps the top words whose probability is at least Top A squared. Higher = more variety. 0 = disabled."
                />
                <GenerationSlider
                  label="TFS"
                  value={store.tfs}
                  min={0}
                  max={1}
                  step={0.001}
                  onChange={(v) => update('tfs', v)}
                  description="Tail-free sampling. Trims the long tail of unlikely words. 1.0 = disabled. Lower = more aggressive trimming."
                />
              </>
            )}
          </InlineSection>

          <InlineSection panelId="generation" sectionId="repetition" title="Repetition">
            {mode === 'text' ? (
              <>
                <GenerationSlider
                  label="Rep Pen"
                  value={store.rep_pen}
                  min={1}
                  max={8}
                  step={0.025}
                  onChange={(v) => update('rep_pen', v)}
                  description="Penalizes the model for repeating words. 1.0 = no penalty. Higher = less repetition but may lose coherence."
                />
                <GenerationSlider
                  label="Rep Pen Range"
                  value={store.rep_pen_range}
                  min={0}
                  max={8192}
                  step={1}
                  onChange={(v) => update('rep_pen_range', v)}
                  description="How many recent tokens to look at for repetition. 0 = whole text. 256 = only check last 256 tokens."
                />
                <GenerationSlider
                  label="Rep Pen Slope"
                  value={store.rep_pen_slope}
                  min={0}
                  max={10}
                  step={0.01}
                  onChange={(v) => update('rep_pen_slope', v)}
                  description="How quickly the repetition penalty fades for older tokens. Higher = penalty fades faster."
                />
              </>
            ) : (
              <>
                <GenerationSlider
                  label="Freq Penalty"
                  value={store.frequency_penalty}
                  min={-2}
                  max={2}
                  step={0.01}
                  onChange={(v) => update('frequency_penalty', v)}
                  description="Penalizes words based on how often they appear. Positive = less frequent words preferred. Negative = common words preferred."
                />
                <GenerationSlider
                  label="Pres Penalty"
                  value={store.presence_penalty}
                  min={-2}
                  max={2}
                  step={0.01}
                  onChange={(v) => update('presence_penalty', v)}
                  description="Penalizes any word that has appeared at all. Positive = encourages new topics. Negative = sticks to what was said."
                />
              </>
            )}
          </InlineSection>

          <InlineSection panelId="generation" sectionId="advanced" title="Advanced">
            {mode === 'text' && (
              <>
                <GenerationSlider
                  label="DRY Multiplier"
                  value={store.dry_multiplier}
                  min={0}
                  max={10}
                  step={0.1}
                  onChange={(v) => update('dry_multiplier', v)}
                  description="DRY repetition penalty strength. Higher = stronger penalty for repeated phrases. 0 = disabled."
                />
                <GenerationSlider
                  label="DRY Base"
                  value={store.dry_base}
                  min={0}
                  max={10}
                  step={0.1}
                  onChange={(v) => update('dry_base', v)}
                  description="How aggressively DRY scales penalty with repetition length. Higher = penalty grows faster with each repeat."
                />
                <GenerationSlider
                  label="DRY Allowed Length"
                  value={store.dry_allowed_length}
                  min={0}
                  max={20}
                  step={1}
                  onChange={(v) => update('dry_allowed_length', v)}
                  description="How many tokens of repetition are allowed before DRY kicks in. 0 = no repeats allowed."
                />
                <div className="space-y-1">
                  <label className="mono-tag text-foreground/60">Mirostat Mode</label>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => update('mirostat_mode', m)}
                        className={cn(
                          'flex-1 rounded-md border py-0.5 font-mono text-[10px] transition-all',
                          store.mirostat_mode === m
                            ? 'bg-ember/15 text-ember border-ember/25'
                            : 'border-border text-foreground/40 hover:text-foreground/60',
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <p className="text-foreground/30 text-[9px]">0 = off, 1 = v1, 2 = v2</p>
                </div>
                {store.mirostat_mode !== 0 && (
                  <>
                    <GenerationSlider
                      label="Mirostat Tau"
                      value={store.mirostat_tau}
                      min={0}
                      max={10}
                      step={0.1}
                      onChange={(v) => update('mirostat_tau', v)}
                      description="Target perplexity for Mirostat. Lower = more focused and coherent. Higher = more diverse and creative."
                    />
                    <GenerationSlider
                      label="Mirostat Eta"
                      value={store.mirostat_eta}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(v) => update('mirostat_eta', v)}
                      description="How quickly Mirostat adapts to maintain target perplexity. Higher = faster adaptation."
                    />
                  </>
                )}
                <GenerationSlider
                  label="Smoothing Factor"
                  value={store.smoothing_factor}
                  min={0}
                  max={10}
                  step={0.1}
                  onChange={(v) => update('smoothing_factor', v)}
                  description="Smooths the probability distribution for more natural word choices. Higher = smoother distribution."
                />
                <GenerationSlider
                  label="Epsilon Cutoff"
                  value={store.epsilon_cutoff}
                  min={0}
                  max={9}
                  step={0.01}
                  onChange={(v) => update('epsilon_cutoff', v)}
                  description="Hard cutoff: removes any word with probability below this value. 0 = disabled."
                />
                <GenerationSlider
                  label="Eta Cutoff"
                  value={store.eta_cutoff}
                  min={0}
                  max={20}
                  step={0.01}
                  onChange={(v) => update('eta_cutoff', v)}
                  description="Softer version of epsilon cutoff. 0 = disabled. Lower = more aggressive filtering."
                />
              </>
            )}
            {mode === 'chat' && (
              <p className="text-foreground/35 py-1.5 text-[10px]">
                Advanced settings are text-completion only.
              </p>
            )}
          </InlineSection>

          <InlineSection panelId="generation" sectionId="output" title="Output">
            <GenerationSlider
              label="Max Tokens"
              value={store.max_tokens}
              min={1}
              max={8192}
              step={1}
              onChange={(v) => update('max_tokens', v)}
              description="Maximum number of tokens to generate. Higher = longer possible response."
            />
            <GenerationSlider
              label="Context Size"
              value={store.max_context}
              min={512}
              max={131072}
              step={512}
              onChange={(v) => update('max_context', v)}
              description="Maximum context window size in tokens. Higher = more conversation history retained. Set to match your model's context length."
            />
            {mode === 'text' && (
              <GenerationSlider
                label="Min Tokens"
                value={store.min_tokens}
                min={0}
                max={2048}
                step={1}
                onChange={(v) => update('min_tokens', v)}
                description="Minimum tokens before the response stops. Useful for ensuring complete answers."
              />
            )}
            <div className="space-y-1">
              <label className="mono-tag text-foreground/60">Stop Sequences</label>
              <input
                type="text"
                value={store.stop.join(', ')}
                onChange={(e) =>
                  update(
                    'stop',
                    e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
                placeholder="comma separated"
                className={cn(
                  'border-border bg-background/60 h-6 w-full rounded-md border px-2',
                  'text-foreground/80 placeholder:text-foreground/25 text-[11px] outline-none',
                  'focus:border-ember/50',
                )}
                aria-label="Stop sequences"
              />
            </div>
            <div className="space-y-1">
              <label className="mono-tag text-foreground/60">Seed</label>
              <input
                type="number"
                value={store.seed}
                onChange={(e) => update('seed', parseInt(e.target.value, 10) || -1)}
                className={cn(
                  'border-border bg-background/60 h-6 w-full rounded-md border px-2',
                  'text-foreground/80 text-[11px] outline-none',
                  'focus:border-ember/50 focus:ring-ember/20',
                  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                )}
                aria-label="Seed value"
              />
              <p className="text-foreground/30 text-[9px]">-1 for random</p>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <label className="mono-tag text-foreground/60">Streaming</label>
              <button
                type="button"
                role="switch"
                aria-checked={streamingEnabled}
                onClick={() => setStreamingEnabled(!streamingEnabled)}
                className={cn(
                  'relative h-4 w-7 overflow-hidden rounded-full transition-colors duration-200',
                  streamingEnabled ? 'bg-ember/60' : 'bg-border',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200',
                    streamingEnabled ? 'translate-x-3' : 'translate-x-0',
                  )}
                />
              </button>
            </div>
          </InlineSection>
        </div>
      </div>
    </aside>
  );
}
