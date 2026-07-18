import { useCallback, useState } from 'react';
import { Save, FolderOpen, RotateCcw, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGenerationStore } from '@/lib/stores';
import { GenerationModeToggle } from '@/components/GenerationModeToggle';
import { GenerationSlider } from '@/components/GenerationSlider';
import { InlineSection } from '@/components/drawers/InlineSection';

interface GenerationSidebarProps {
  mode?: 'sidebar' | 'drawer';
}

type PresetStatus = 'idle' | 'saving' | 'loading' | 'ok' | 'err';

export function GenerationSidebar({ mode: _mode = 'sidebar' }: GenerationSidebarProps) {
  const store = useGenerationStore();
  const { mode } = store;
  const [presetStatus, setPresetStatus] = useState<PresetStatus>('idle');
  const [presetMessage, setPresetMessage] = useState<string>('');

  const flashStatus = (status: PresetStatus, message: string) => {
    setPresetStatus(status);
    setPresetMessage(message);
    window.setTimeout(() => {
      setPresetStatus('idle');
      setPresetMessage('');
    }, 2000);
  };

  const handleSavePreset = useCallback(async () => {
    const name = window.prompt('Save generation preset as:');
    if (!name) return;
    setPresetStatus('saving');
    try {
      await store.savePresetToBackend(name);
      flashStatus('ok', `Saved "${name.trim()}"`);
    } catch (err) {
      flashStatus('err', err instanceof Error ? err.message : String(err));
    }
  }, [store]);

  const handleLoadPreset = useCallback(async () => {
    setPresetStatus('loading');
    let names: string[] = [];
    try {
      names = await store.listAvailablePresets();
    } catch (err) {
      flashStatus('err', err instanceof Error ? err.message : String(err));
      return;
    }
    const hint =
      names.length > 0
        ? `Available presets:\n${names.join('\n')}\n\nEnter a name to load:`
        : 'Enter a preset name to load:';
    const name = window.prompt(hint);
    if (!name) {
      setPresetStatus('idle');
      return;
    }
    setPresetStatus('loading');
    try {
      await store.loadPresetFromBackend(name);
      flashStatus('ok', `Loaded "${name.trim()}"`);
    } catch (err) {
      flashStatus('err', err instanceof Error ? err.message : String(err));
    }
  }, [store]);

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
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Zap className="text-ember h-3 w-3" strokeWidth={2} />
              <span className="display-host text-[13px] leading-none">Generation</span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handleSavePreset}
                disabled={presetStatus === 'saving' || presetStatus === 'loading'}
                className={cn(
                  'text-foreground/40 hover:text-foreground/70 hover:bg-accent/30 rounded-sm p-1 transition-colors',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                )}
                title="Save preset"
                aria-label="Save preset"
              >
                <Save className="h-2.5 w-2.5" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={handleLoadPreset}
                disabled={presetStatus === 'saving' || presetStatus === 'loading'}
                className={cn(
                  'text-foreground/40 hover:text-foreground/70 hover:bg-accent/30 rounded-sm p-1 transition-colors',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                )}
                title="Load preset"
                aria-label="Load preset"
              >
                <FolderOpen className="h-2.5 w-2.5" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => store.resetDefaults()}
                className="text-foreground/40 hover:text-foreground/70 hover:bg-accent/30 rounded-sm p-1 transition-colors"
                title="Reset to defaults"
                aria-label="Reset to defaults"
              >
                <RotateCcw className="h-2.5 w-2.5" strokeWidth={2} />
              </button>
            </div>
          </div>
          {presetMessage && (
            <div
              role="status"
              aria-live="polite"
              className={cn(
                'mb-1.5 rounded-sm px-2 py-0.5 text-[10px] leading-tight',
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
          <GenerationModeToggle />
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
              description="Randomness of output"
            />
            <GenerationSlider
              label="Top P"
              value={store.top_p}
              min={0}
              max={1}
              step={0.001}
              onChange={(v) => update('top_p', v)}
              description="Nucleus sampling threshold"
            />
            <GenerationSlider
              label="Top K"
              value={store.top_k}
              min={0}
              max={300}
              step={1}
              onChange={(v) => update('top_k', v)}
              description="Top-K sampling"
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
                  description="Minimum probability threshold"
                />
                <GenerationSlider
                  label="Typical P"
                  value={store.typical_p}
                  min={0}
                  max={1}
                  step={0.001}
                  onChange={(v) => update('typical_p', v)}
                  description="Typicality sampling"
                />
                <GenerationSlider
                  label="Top A"
                  value={store.top_a}
                  min={0}
                  max={1}
                  step={0.001}
                  onChange={(v) => update('top_a', v)}
                  description="Top-A sampling"
                />
                <GenerationSlider
                  label="TFS"
                  value={store.tfs}
                  min={0}
                  max={1}
                  step={0.001}
                  onChange={(v) => update('tfs', v)}
                  description="Tail-free sampling"
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
                  description="Repetition penalty"
                />
                <GenerationSlider
                  label="Rep Pen Range"
                  value={store.rep_pen_range}
                  min={0}
                  max={8192}
                  step={1}
                  onChange={(v) => update('rep_pen_range', v)}
                  description="Token range for penalty"
                />
                <GenerationSlider
                  label="Rep Pen Slope"
                  value={store.rep_pen_slope}
                  min={0}
                  max={10}
                  step={0.01}
                  onChange={(v) => update('rep_pen_slope', v)}
                  description="Penalty slope"
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
                  description="Reduce frequency of tokens"
                />
                <GenerationSlider
                  label="Pres Penalty"
                  value={store.presence_penalty}
                  min={-2}
                  max={2}
                  step={0.01}
                  onChange={(v) => update('presence_penalty', v)}
                  description="Reduce presence of tokens"
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
                  description="Don't Repeat Yourself"
                />
                <GenerationSlider
                  label="DRY Base"
                  value={store.dry_base}
                  min={0}
                  max={10}
                  step={0.1}
                  onChange={(v) => update('dry_base', v)}
                  description="DRY penalty base"
                />
                <GenerationSlider
                  label="DRY Allowed Length"
                  value={store.dry_allowed_length}
                  min={0}
                  max={20}
                  step={1}
                  onChange={(v) => update('dry_allowed_length', v)}
                  description="Allowed repeat length"
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
                          'flex-1 rounded-sm border py-0.5 font-mono text-[10px] transition-all',
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
                      description="Target entropy"
                    />
                    <GenerationSlider
                      label="Mirostat Eta"
                      value={store.mirostat_eta}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(v) => update('mirostat_eta', v)}
                      description="Learning rate"
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
                  description="Quadratic sampling"
                />
                <GenerationSlider
                  label="Epsilon Cutoff"
                  value={store.epsilon_cutoff}
                  min={0}
                  max={9}
                  step={0.01}
                  onChange={(v) => update('epsilon_cutoff', v)}
                  description="Epsilon cutoff"
                />
                <GenerationSlider
                  label="Eta Cutoff"
                  value={store.eta_cutoff}
                  min={0}
                  max={20}
                  step={0.01}
                  onChange={(v) => update('eta_cutoff', v)}
                  description="Eta cutoff"
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
              description="Maximum response length"
            />
            {mode === 'text' && (
              <GenerationSlider
                label="Min Tokens"
                value={store.min_tokens}
                min={0}
                max={2048}
                step={1}
                onChange={(v) => update('min_tokens', v)}
                description="Minimum response length"
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
                  'border-border bg-background/60 h-6 w-full rounded-sm border px-2',
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
                  'border-border bg-background/60 h-6 w-full rounded-sm border px-2',
                  'text-foreground/80 text-[11px] outline-none',
                  'focus:border-ember/50',
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
                aria-checked={store.streaming}
                onClick={() => update('streaming', !store.streaming)}
                className={cn(
                  'relative h-4 w-7 rounded-full transition-colors duration-200',
                  store.streaming ? 'bg-ember/60' : 'bg-border',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200',
                    store.streaming ? 'translate-x-3.5' : 'translate-x-0.5',
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
