import { useCallback, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  RotateCcw,
  Zap,
  Copy,
  PanelLeftClose,
  Upload,
  ChevronUp,
  ChevronDown,
  Trash2,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppStore, useGenerationStore, PARAM_KEYS } from '@/lib/stores';
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
import { apiPost, deletePreset, renamePreset } from '@/lib/api';

interface GenerationSidebarProps {
  mode?: 'sidebar' | 'drawer';
  onToggle?: () => void;
}

type PresetStatus = 'idle' | 'saving' | 'loading' | 'ok' | 'err';

function parseSillyTavernGenerationPreset(
  json: Record<string, unknown>,
): Partial<ReturnType<typeof useGenerationStore.getState>> | null {
  const tgSettings = json.textgenerationwebui_settings as Record<string, unknown> | undefined;
  const nestedPreset = json.preset as Record<string, unknown> | undefined;
  const source = tgSettings ?? nestedPreset ?? json;

  if (typeof source !== 'object' || source === null) return null;

  const params: Record<string, unknown> = {};

  const fieldMap: Record<string, string> = {
    temp: 'temperature',
    freq_pen: 'frequency_penalty',
    presence_pen: 'presence_penalty',
  };

  const numericKeys = [
    'temperature',
    'top_p',
    'top_k',
    'max_tokens',
    'seed',
    'frequency_penalty',
    'presence_penalty',
    'min_tokens',
    'min_p',
    'typical_p',
    'top_a',
    'tfs',
    'rep_pen',
    'rep_pen_range',
    'rep_pen_slope',
    'dry_multiplier',
    'dry_base',
    'dry_allowed_length',
    'mirostat_mode',
    'mirostat_tau',
    'mirostat_eta',
    'smoothing_factor',
    'epsilon_cutoff',
    'eta_cutoff',
    'smoothing_curve',
    'rep_pen_decay',
    'dry_penalty_last_n',
    'min_temp',
    'max_temp',
    'dynatemp_exponent',
    'penalty_alpha',
    'num_beams',
    'length_penalty',
    'min_length',
    'encoder_rep_pen',
    'skew',
    'xtc_threshold',
    'xtc_probability',
    'nsigma',
    'min_keep',
    'rep_pen_size',
    'adaptive_target',
    'adaptive_decay',
    'no_repeat_ngram_size',
    'guidance_scale',
    'max_length',
  ];

  for (const key of numericKeys) {
    if (key in source) {
      const val = source[key];
      if (typeof val === 'number') params[key] = val;
    }
  }

  if ('dry_sequence_breakers' in source) {
    const val = source.dry_sequence_breakers;
    if (typeof val === 'string') {
      let parsed: unknown;
      try {
        parsed = JSON.parse(val);
      } catch {
        parsed = null;
      }
      if (Array.isArray(parsed) && parsed.every((s: unknown) => typeof s === 'string')) {
        params.dry_sequence_breakers = val;
      }
    } else if (Array.isArray(val) && val.every((s: unknown) => typeof s === 'string')) {
      params.dry_sequence_breakers = JSON.stringify(val);
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

  if ('samplers' in source && Array.isArray(source.samplers)) {
    const samplers = source.samplers;
    if (samplers.every((s: unknown) => typeof s === 'string')) {
      params.samplers = samplers;
    }
  } else if ('sampler_order' in source && Array.isArray(source.sampler_order)) {
    const order = source.sampler_order;
    if (order.every((n: unknown) => typeof n === 'number')) {
      const KOBOLD_TO_LLAMACPP: Record<number, string> = {
        0: 'top_k',
        1: 'top_p',
        2: 'tfs',
        3: 'typ_p',
        4: 'temperature',
        5: 'top_a',
        6: 'penalties',
      };
      params.samplers = order.map((n: number) => KOBOLD_TO_LLAMACPP[n]).filter(Boolean);
    }
  } else if ('sampler_priority' in source && Array.isArray(source.sampler_priority)) {
    const priority = source.sampler_priority;
    if (priority.every((s: unknown) => typeof s === 'string')) {
      const OOBA_TO_LLAMACPP: Record<string, string> = {
        repetition_penalty: 'penalties',
        frequency_penalty: 'penalties',
        presence_penalty: 'penalties',
        top_n_sigma: 'top_n_sigma',
        typical_p: 'typ_p',
        temperature: 'temperature',
        min_p: 'min_p',
        top_a: 'top_a',
        top_k: 'top_k',
        top_p: 'top_p',
      };
      const seen = new Set<string>();
      params.samplers = priority
        .map((s: string) => OOBA_TO_LLAMACPP[s])
        .filter((s: string | undefined): s is string => !!s && !seen.has(s) && (seen.add(s), true));
    }
  }

  const booleanKeys = [
    'skip_special_tokens',
    'add_bos_token',
    'ban_eos_token',
    'temperature_last',
    'do_sample',
    'early_stopping',
    'dynatemp',
    'json_schema_allow_empty',
    'ignore_eos_token',
    'spaces_between_special_tokens',
    'speculative_ngram',
  ] as const;
  for (const key of booleanKeys) {
    if (key in source) {
      const val = source[key];
      if (typeof val === 'boolean') params[key] = val;
    }
  }

  if ('negative_prompt' in source && typeof source.negative_prompt === 'string') {
    params.negative_prompt = source.negative_prompt;
  }
  if ('grammar_string' in source && typeof source.grammar_string === 'string') {
    params.grammar_string = source.grammar_string;
  }
  if ('banned_tokens' in source && typeof source.banned_tokens === 'string') {
    params.banned_tokens = source.banned_tokens;
  }
  if (
    'json_schema' in source &&
    typeof source.json_schema === 'object' &&
    source.json_schema !== null
  ) {
    params.json_schema = source.json_schema;
  }
  if ('sampler_priority' in source && Array.isArray(source.sampler_priority)) {
    params.sampler_priority = source.sampler_priority;
  }
  if ('samplers_priorities' in source && Array.isArray(source.samplers_priorities)) {
    params.samplers_priorities = source.samplers_priorities;
  }
  if ('sampler_order' in source && Array.isArray(source.sampler_order)) {
    params.sampler_order = source.sampler_order;
  }
  if ('logit_bias' in source && Array.isArray(source.logit_bias)) {
    params.logit_bias = source.logit_bias;
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

function stripName(data: Record<string, unknown>): Record<string, unknown> {
  const { name: _name, ...rest } = data;
  return rest;
}

async function findMatchingPresetName(
  category: string,
  data: Record<string, unknown>,
): Promise<string | null> {
  const existing = await apiPost<Array<{ data?: Record<string, unknown> }>>('/presets/all', {
    category,
  });
  const target = JSON.stringify(stripName(data));
  for (const p of existing) {
    const pData = p.data;
    if (!pData) continue;
    if (JSON.stringify(stripName(pData)) === target) {
      const matchName = (pData.name as string) ?? '';
      if (matchName) return matchName;
    }
  }
  return null;
}

const ALL_SAMPLERS = [
  'penalties',
  'dry',
  'top_n_sigma',
  'top_k',
  'typ_p',
  'top_p',
  'min_p',
  'xtc',
  'temperature',
  'adaptive_p',
] as const;

const SAMPLER_LABELS: Record<string, string> = {
  penalties: 'Penalties',
  dry: 'DRY',
  top_n_sigma: 'Top N Sigma',
  top_k: 'Top K',
  typ_p: 'Typical P',
  top_p: 'Top P',
  min_p: 'Min P',
  xtc: 'XTC',
  temperature: 'Temperature',
  adaptive_p: 'Adaptive P',
};

export function GenerationSidebar({ mode: _mode = 'sidebar', onToggle }: GenerationSidebarProps) {
  const mode = useGenerationStore((s) => s.mode);
  const preset = useGenerationStore((s) => s.preset);
  const loadPreset = useGenerationStore((s) => s.loadPreset);
  const loadPresetFromBackend = useGenerationStore((s) => s.loadPresetFromBackend);
  const savePresetToBackend = useGenerationStore((s) => s.savePresetToBackend);
  const resetDefaults = useGenerationStore((s) => s.resetDefaults);
  const samplers = useGenerationStore((s) => s.samplers);
  const temperature = useGenerationStore((s) => s.temperature);
  const top_p = useGenerationStore((s) => s.top_p);
  const top_k = useGenerationStore((s) => s.top_k);
  const min_p = useGenerationStore((s) => s.min_p);
  const typical_p = useGenerationStore((s) => s.typical_p);
  const top_a = useGenerationStore((s) => s.top_a);
  const tfs = useGenerationStore((s) => s.tfs);
  const rep_pen = useGenerationStore((s) => s.rep_pen);
  const rep_pen_range = useGenerationStore((s) => s.rep_pen_range);
  const rep_pen_slope = useGenerationStore((s) => s.rep_pen_slope);
  const rep_pen_decay = useGenerationStore((s) => s.rep_pen_decay);
  const dry_penalty_last_n = useGenerationStore((s) => s.dry_penalty_last_n);
  const encoder_rep_pen = useGenerationStore((s) => s.encoder_rep_pen);
  const frequency_penalty = useGenerationStore((s) => s.frequency_penalty);
  const presence_penalty = useGenerationStore((s) => s.presence_penalty);
  const smoothing_curve = useGenerationStore((s) => s.smoothing_curve);
  const penalty_alpha = useGenerationStore((s) => s.penalty_alpha);
  const num_beams = useGenerationStore((s) => s.num_beams);
  const length_penalty = useGenerationStore((s) => s.length_penalty);
  const min_length = useGenerationStore((s) => s.min_length);
  const skew = useGenerationStore((s) => s.skew);
  const dynatemp = useGenerationStore((s) => s.dynatemp);
  const min_temp = useGenerationStore((s) => s.min_temp);
  const max_temp = useGenerationStore((s) => s.max_temp);
  const dynatemp_exponent = useGenerationStore((s) => s.dynatemp_exponent);
  const xtc_threshold = useGenerationStore((s) => s.xtc_threshold);
  const xtc_probability = useGenerationStore((s) => s.xtc_probability);
  const nsigma = useGenerationStore((s) => s.nsigma);
  const min_keep = useGenerationStore((s) => s.min_keep);
  const rep_pen_size = useGenerationStore((s) => s.rep_pen_size);
  const adaptive_target = useGenerationStore((s) => s.adaptive_target);
  const adaptive_decay = useGenerationStore((s) => s.adaptive_decay);
  const dry_multiplier = useGenerationStore((s) => s.dry_multiplier);
  const dry_base = useGenerationStore((s) => s.dry_base);
  const dry_allowed_length = useGenerationStore((s) => s.dry_allowed_length);
  const mirostat_mode = useGenerationStore((s) => s.mirostat_mode);
  const mirostat_tau = useGenerationStore((s) => s.mirostat_tau);
  const mirostat_eta = useGenerationStore((s) => s.mirostat_eta);
  const smoothing_factor = useGenerationStore((s) => s.smoothing_factor);
  const epsilon_cutoff = useGenerationStore((s) => s.epsilon_cutoff);
  const eta_cutoff = useGenerationStore((s) => s.eta_cutoff);
  const temperature_last = useGenerationStore((s) => s.temperature_last);
  const do_sample = useGenerationStore((s) => s.do_sample);
  const early_stopping = useGenerationStore((s) => s.early_stopping);
  const max_tokens = useGenerationStore((s) => s.max_tokens);
  const max_context = useGenerationStore((s) => s.max_context);
  const min_tokens = useGenerationStore((s) => s.min_tokens);
  const no_repeat_ngram_size = useGenerationStore((s) => s.no_repeat_ngram_size);
  const guidance_scale = useGenerationStore((s) => s.guidance_scale);
  const max_length = useGenerationStore((s) => s.max_length);
  const stop = useGenerationStore((s) => s.stop);
  const seed = useGenerationStore((s) => s.seed);
  const ignore_eos_token = useGenerationStore((s) => s.ignore_eos_token);
  const spaces_between_special_tokens = useGenerationStore((s) => s.spaces_between_special_tokens);
  const speculative_ngram = useGenerationStore((s) => s.speculative_ngram);
  const negative_prompt = useGenerationStore((s) => s.negative_prompt);
  const grammar_string = useGenerationStore((s) => s.grammar_string);
  const banned_tokens = useGenerationStore((s) => s.banned_tokens);
  const streamingEnabled = useAppStore((s) => s.streamingEnabled);
  const setStreamingEnabled = useAppStore((s) => s.setStreamingEnabled);
  const smoothStreaming = useAppStore((s) => s.smoothStreaming);
  const setSmoothStreaming = useAppStore((s) => s.setSmoothStreaming);
  const [presetStatus, setPresetStatus] = useState<PresetStatus>('idle');
  const [presetMessage, setPresetMessage] = useState<string>('');
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [renameName, setRenameName] = useState('');
  const [showRenameInput, setShowRenameInput] = useState(false);
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
      const categories = [
        'generation',
        'textgenerationwebui',
        'instruct',
        'context',
        'sysprompt',
        'reasoning',
      ];
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
                  loadPreset(parsed);

                  const importData = { name: baseName, ...parsed };
                  const matchName = await findMatchingPresetName('generation', importData);
                  if (matchName) {
                    useGenerationStore.getState().updateParam('preset', matchName);
                    toast.success(`Preset already exists as "${matchName}" — loaded instead`);
                    imported.push(`generation preset "${matchName}"`);
                    continue;
                  }

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
                const importData = { ...sectionData, name: rawName };
                const matchName = await findMatchingPresetName(category, importData);
                if (matchName) {
                  toast.success(`Preset already exists as "${matchName}" — loaded instead`);
                  imported.push(`${section} template "${matchName}"`);
                  continue;
                }
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

          loadPreset(parsed);

          const baseName = file.name.replace(/\.json$/i, '') || 'Imported';
          const importData = { name: baseName, ...parsed };
          const matchName = await findMatchingPresetName('generation', importData);
          if (matchName) {
            useGenerationStore.getState().updateParam('preset', matchName);
            await queryClient.invalidateQueries({ queryKey: ['/api/v1/presets/all'] });
            toast.success(`Preset already exists as "${matchName}" — loaded instead`);
            return;
          }

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
    [loadPreset, loadPresetFromBackend, presetNames, defaultPresets, queryClient, flashStatus],
  );

  const isCurrentPresetDefault = defaultPresets.has(preset);

  const handleSavePreset = useCallback(async () => {
    const name = saveName.trim();
    if (!name) return;
    if (isCurrentPresetDefault && name === preset) {
      flashStatus('err', `Cannot overwrite default preset "${name}". Choose a different name.`);
      return;
    }
    setPresetStatus('saving');
    try {
      const state = useGenerationStore.getState();
      const saveData: Record<string, unknown> = { name };
      for (const key of PARAM_KEYS) {
        saveData[key] = state[key] as unknown;
      }
      const matchName = await findMatchingPresetName('generation', saveData);
      if (matchName && matchName !== name) {
        flashStatus('err', `Preset already exists as "${matchName}" — loaded instead`);
        await loadPresetFromBackend(matchName);
        setSaveName('');
        setShowSaveInput(false);
        return;
      }
      await savePresetToBackend(name);
      flashStatus('ok', `Saved "${name}"`);
      setSaveName('');
      setShowSaveInput(false);
    } catch (err) {
      flashStatus('err', err instanceof Error ? err.message : String(err));
    }
  }, [preset, saveName, isCurrentPresetDefault, flashStatus, savePresetToBackend]);

  const handleClonePreset = useCallback(() => {
    const baseName = (preset || 'Preset').replace(/\s*\(\d+\)$/, '');
    const existingNames = new Set(presetNames);
    let cloneName = `${baseName} (1)`;
    let counter = 2;
    while (existingNames.has(cloneName)) {
      cloneName = `${baseName} (${counter})`;
      counter++;
    }
    setSaveName(cloneName);
    setShowSaveInput(true);
  }, [preset, presetNames]);

  const handleLoadPreset = useCallback(
    async (name: string) => {
      if (!name) return;
      setPresetStatus('loading');
      try {
        await loadPresetFromBackend(name);
        flashStatus('ok', `Loaded "${name}"`);
      } catch (err) {
        flashStatus('err', err instanceof Error ? err.message : String(err));
      }
    },
    [loadPresetFromBackend, flashStatus],
  );

  const handleDeletePreset = useCallback(async () => {
    const name = preset;
    if (!name || defaultPresets.has(name)) return;
    if (!window.confirm(`Delete preset "${name}"? This cannot be undone.`)) return;
    setPresetStatus('saving');
    try {
      await deletePreset('generation', name);
      await queryClient.invalidateQueries({ queryKey: ['/api/v1/presets/all'] });
      useGenerationStore.getState().updateParam('preset', 'Default');
      flashStatus('ok', `Deleted "${name}"`);
    } catch (err) {
      flashStatus('err', err instanceof Error ? err.message : String(err));
    }
  }, [preset, defaultPresets, queryClient, flashStatus]);

  const handleRenamePreset = useCallback(async () => {
    const newName = renameName.trim();
    if (!newName || !preset) return;
    if (defaultPresets.has(preset)) return;
    if (newName === preset) {
      flashStatus('err', 'New name is the same as the current name');
      return;
    }
    if (presetNames.includes(newName)) {
      flashStatus('err', `Preset "${newName}" already exists`);
      return;
    }
    setPresetStatus('saving');
    try {
      await renamePreset('generation', preset, newName);
      await queryClient.invalidateQueries({ queryKey: ['/api/v1/presets/all'] });
      useGenerationStore.getState().updateParam('preset', newName);
      flashStatus('ok', `Renamed to "${newName}"`);
      setRenameName('');
      setShowRenameInput(false);
    } catch (err) {
      flashStatus('err', err instanceof Error ? err.message : String(err));
    }
  }, [preset, renameName, presetNames, defaultPresets, queryClient, flashStatus]);

  const update = useCallback(
    <K extends keyof ReturnType<typeof useGenerationStore.getState>>(
      key: K,
      value: ReturnType<typeof useGenerationStore.getState>[K],
    ) => {
      useGenerationStore.getState().updateParam(key, value);
    },
    [],
  );

  const handleToggleSampler = (sampler: string) => {
    const current = [...samplers];
    const idx = current.indexOf(sampler);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(sampler);
    }
    update('samplers', current);
  };

  const handleMoveUp = (sampler: string) => {
    const current = [...samplers];
    const idx = current.indexOf(sampler);
    if (idx > 0) {
      const a = current[idx - 1] as string;
      const b = current[idx] as string;
      current[idx - 1] = b;
      current[idx] = a;
      update('samplers', current);
    }
  };

  const handleMoveDown = (sampler: string) => {
    const current = [...samplers];
    const idx = current.indexOf(sampler);
    if (idx >= 0 && idx < current.length - 1) {
      const a = current[idx] as string;
      const b = current[idx + 1] as string;
      current[idx] = b;
      current[idx + 1] = a;
      update('samplers', current);
    }
  };

  return (
    <aside className="generation-sidebar" role="complementary" aria-label="Generation settings">
      <div className="flex h-full flex-col">
        <div className="border-border/40 border-b px-3 pt-3 pb-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <Zap className="text-ember h-3 w-3 shrink-0" strokeWidth={2} />
              <span className="display-host truncate text-[13px] leading-none">Generation</span>
            </div>
            <div
              className={cn(
                'grid shrink-0 items-center transition-all duration-200 ease-out',
                showSaveInput || showRenameInput ? 'grid-cols-[1fr_0fr]' : 'grid-cols-[0fr_1fr]',
              )}
            >
              <div className="min-w-0 overflow-hidden">
                <div className="flex items-center gap-1">
                  {showSaveInput ? (
                    <>
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
                        className="touch-target h-5 w-20 text-[10px]"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSavePreset}
                        disabled={!saveName.trim() || presetStatus === 'saving'}
                        className={cn(
                          'text-foreground/40 hover:text-foreground/70 hover:bg-accent/30 rounded-md touch-target h-auto p-1 transition-colors',
                          'disabled:cursor-not-allowed disabled:opacity-40',
                        )}
                        title="Confirm save"
                      >
                        <Save className="h-2.5 w-2.5" strokeWidth={2} />
                      </button>
                    </>
                  ) : showRenameInput ? (
                    <>
                      <Input
                        type="text"
                        value={renameName}
                        onChange={(e) => setRenameName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenamePreset();
                          if (e.key === 'Escape') {
                            setShowRenameInput(false);
                            setRenameName('');
                          }
                        }}
                        placeholder="New preset name"
                        className="touch-target h-5 w-20 text-[10px]"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleRenamePreset}
                        disabled={!renameName.trim() || presetStatus === 'saving'}
                        className={cn(
                          'text-foreground/40 hover:text-foreground/70 hover:bg-accent/30 rounded-md touch-target h-auto p-1 transition-colors',
                          'disabled:cursor-not-allowed disabled:opacity-40',
                        )}
                        title="Confirm rename"
                      >
                        <Save className="h-2.5 w-2.5" strokeWidth={2} />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
              <div
                className={cn(
                  'min-w-0 overflow-hidden transition-all duration-200 ease-out',
                  showSaveInput || showRenameInput ? 'invisible opacity-0' : 'opacity-100',
                )}
              >
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={handleImportClick}
                    disabled={presetStatus === 'saving' || presetStatus === 'loading'}
                    className={cn(
                      'text-foreground/40 hover:text-foreground/70 hover:bg-accent/30 rounded-md touch-target h-auto p-1 transition-colors',
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
                      'text-foreground/40 hover:text-foreground/70 hover:bg-accent/30 rounded-md touch-target h-auto p-1 transition-colors',
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
                        setSaveName(preset);
                        setShowSaveInput(true);
                      }}
                      disabled={presetStatus === 'saving' || presetStatus === 'loading'}
                      className={cn(
                        'text-foreground/40 hover:text-foreground/70 hover:bg-accent/30 rounded-md touch-target h-auto p-1 transition-colors',
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
                    onClick={() => resetDefaults()}
                    className="text-foreground/40 hover:text-foreground/70 hover:bg-accent/30 rounded-md touch-target h-auto p-1 transition-colors"
                    title="Reset to defaults"
                    aria-label="Reset to defaults"
                  >
                    <RotateCcw className="h-2.5 w-2.5" strokeWidth={2} />
                  </button>
                  {onToggle && (
                    <button
                      type="button"
                      onClick={onToggle}
                      className="text-foreground/40 hover:text-foreground/70 hover:bg-accent/30 rounded-md touch-target h-auto p-1 transition-colors"
                      title="Hide generation options"
                      aria-label="Hide generation options"
                    >
                      <PanelLeftClose className="h-2.5 w-2.5" strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
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
          <div className="mt-2 flex items-center gap-1">
            <Select value={preset} onValueChange={handleLoadPreset}>
              <SelectTrigger className="touch-target h-6 text-[11px]">
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
            {preset && !defaultPresets.has(preset) && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setRenameName(preset);
                    setShowRenameInput(true);
                  }}
                  disabled={presetStatus === 'saving' || presetStatus === 'loading'}
                  className={cn(
                    'text-foreground/40 hover:text-foreground/70 hover:bg-accent/30 rounded-md touch-target h-auto p-1 transition-colors',
                    'disabled:cursor-not-allowed disabled:opacity-40',
                  )}
                  title="Rename preset"
                  aria-label="Rename preset"
                >
                  <Pencil className="h-2.5 w-2.5" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={handleDeletePreset}
                  disabled={presetStatus === 'saving' || presetStatus === 'loading'}
                  className={cn(
                    'text-foreground/40 hover:text-foreground/70 hover:bg-accent/30 rounded-md touch-target h-auto p-1 transition-colors',
                    'disabled:cursor-not-allowed disabled:opacity-40',
                  )}
                  title="Delete preset"
                  aria-label="Delete preset"
                >
                  <Trash2 className="h-2.5 w-2.5" strokeWidth={2} />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <InlineSection panelId="generation" sectionId="sampling" title="Sampling" defaultOpen>
            <GenerationSlider
              label="Temperature"
              value={temperature}
              min={0}
              max={2.5}
              step={0.01}
              onChange={(v) => update('temperature', v)}
              description="How creative vs focused the output is. Lower = more predictable and repetitive. Higher = more random and surprising."
            />
            <GenerationSlider
              label="Top P"
              value={top_p}
              min={0}
              max={1}
              step={0.001}
              onChange={(v) => update('top_p', v)}
              description="Cuts off less likely words. 1.0 = consider everything. 0.5 = only consider the top 50% most likely words. Lower = more focused."
            />
            <GenerationSlider
              label="Top K"
              value={top_k}
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
                  value={min_p}
                  min={0}
                  max={1}
                  step={0.001}
                  onChange={(v) => update('min_p', v)}
                  description="Removes tokens below a probability threshold relative to the best option. 0.1 = ignore tokens less than 10% as likely as the top pick."
                />
                <GenerationSlider
                  label="Typical P"
                  value={typical_p}
                  min={0}
                  max={1}
                  step={0.001}
                  onChange={(v) => update('typical_p', v)}
                  description="Prefers 'typical' word choices over the most probable ones. Lower = stranger but more interesting. 1.0 = disabled."
                />
                <GenerationSlider
                  label="Top A"
                  value={top_a}
                  min={0}
                  max={1}
                  step={0.001}
                  onChange={(v) => update('top_a', v)}
                  description="Keeps the top words whose probability is at least Top A squared. Higher = more variety. 0 = disabled."
                />
                <GenerationSlider
                  label="TFS"
                  value={tfs}
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
                  value={rep_pen}
                  min={1}
                  max={8}
                  step={0.025}
                  onChange={(v) => update('rep_pen', v)}
                  description="Penalizes the model for repeating words. 1.0 = no penalty. Higher = less repetition but may lose coherence."
                />
                <GenerationSlider
                  label="Rep Pen Range"
                  value={rep_pen_range}
                  min={0}
                  max={8192}
                  step={1}
                  onChange={(v) => update('rep_pen_range', v)}
                  description="How many recent tokens to look at for repetition. 0 = whole text. 256 = only check last 256 tokens."
                />
                <GenerationSlider
                  label="Rep Pen Slope"
                  value={rep_pen_slope}
                  min={0}
                  max={10}
                  step={0.01}
                  onChange={(v) => update('rep_pen_slope', v)}
                  description="How quickly the repetition penalty fades for older tokens. Higher = penalty fades faster."
                />
                <GenerationSlider
                  label="Rep Pen Decay"
                  value={rep_pen_decay}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(v) => update('rep_pen_decay', v)}
                  description="How much the repetition penalty fades as tokens age. 0 = penalty applies evenly across the whole range. Higher = older tokens are penalized less."
                />
                <GenerationSlider
                  label="Dry Penalty Last N"
                  value={dry_penalty_last_n}
                  min={-1}
                  max={2048}
                  step={1}
                  onChange={(v) => update('dry_penalty_last_n', v)}
                  description="How many recent tokens DRY scans for repeated phrases. -1 = entire context. 0 = disabled."
                />
                <GenerationSlider
                  label="Encoder Rep Pen"
                  value={encoder_rep_pen}
                  min={0}
                  max={10}
                  step={0.01}
                  onChange={(v) => update('encoder_rep_pen', v)}
                  description="Repetition penalty applied to the prompt encoding separately. 1.0 = no penalty."
                />
              </>
            ) : (
              <>
                <GenerationSlider
                  label="Freq Penalty"
                  value={frequency_penalty}
                  min={-2}
                  max={2}
                  step={0.01}
                  onChange={(v) => update('frequency_penalty', v)}
                  description="Penalizes words based on how often they appear. Positive = less frequent words preferred. Negative = common words preferred."
                />
                <GenerationSlider
                  label="Pres Penalty"
                  value={presence_penalty}
                  min={-2}
                  max={2}
                  step={0.01}
                  onChange={(v) => update('presence_penalty', v)}
                  description="Penalizes any word that has appeared at all. Positive = encourages new topics. Negative = sticks to what was said."
                />
              </>
            )}
          </InlineSection>

          <InlineSection
            panelId="generation"
            sectionId="advanced-sampling"
            title="Advanced Sampling"
          >
            {mode === 'text' && (
              <>
                <GenerationSlider
                  label="Smoothing Curve"
                  value={smoothing_curve}
                  min={0}
                  max={10}
                  step={0.01}
                  onChange={(v) => update('smoothing_curve', v)}
                  description="Applies a smoothing curve to flatten the probability distribution. Higher = more even distribution across token choices."
                />
                <GenerationSlider
                  label="Penalty Alpha"
                  value={penalty_alpha}
                  min={0}
                  max={2}
                  step={0.01}
                  onChange={(v) => update('penalty_alpha', v)}
                  description="Contrastive search penalty strength. Encourages diverse yet coherent output by penalizing repetition while rewarding similarity to the context. 0 = disabled."
                />
                <GenerationSlider
                  label="Num Beams"
                  value={num_beams}
                  min={1}
                  max={8}
                  step={1}
                  onChange={(v) => update('num_beams', v)}
                  description="Number of beams used during beam search. 1 = greedy decoding. Higher = explores more candidate paths for more coherent output."
                />
                <GenerationSlider
                  label="Length Penalty"
                  value={length_penalty}
                  min={0}
                  max={4}
                  step={0.01}
                  onChange={(v) => update('length_penalty', v)}
                  description="Length penalty during beam search. Above 1 = favors longer responses. Below 1 = favors shorter responses."
                />
                <GenerationSlider
                  label="Min Length"
                  value={min_length}
                  min={0}
                  max={2048}
                  step={1}
                  onChange={(v) => update('min_length', v)}
                  description="Minimum number of tokens to generate before the model is allowed to stop."
                />
                <GenerationSlider
                  label="Skew"
                  value={skew}
                  min={0}
                  max={10}
                  step={0.01}
                  onChange={(v) => update('skew', v)}
                  description="Skews the probability distribution toward the most likely tokens. Higher = more aggressive bias. 0 = disabled."
                />
              </>
            )}
            {mode === 'chat' && (
              <p className="text-foreground/35 py-1.5 text-[10px]">
                Advanced sampling settings are text-completion only.
              </p>
            )}
          </InlineSection>

          <InlineSection panelId="generation" sectionId="dynatemp-xtc" title="Dynatemp & XTC">
            {mode === 'text' && (
              <>
                <div className="flex items-center justify-between touch-target py-1 sm:py-0.5">
                  <label className="mono-tag text-foreground/60">Dynatemp</label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={dynatemp}
                    onClick={() => update('dynatemp', !dynatemp)}
                    className={cn(
                      'relative h-5 w-9 overflow-hidden rounded-full transition-colors duration-200 sm:h-4 sm:w-7',
                      dynatemp ? 'bg-ember/60' : 'bg-border',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 sm:h-3 sm:w-3',
                        dynatemp ? 'translate-x-4 sm:translate-x-3' : 'translate-x-0',
                      )}
                    />
                  </button>
                </div>
                <GenerationSlider
                  label="Min Temp"
                  value={min_temp}
                  min={0}
                  max={2}
                  step={0.01}
                  onChange={(v) => update('min_temp', v)}
                  description="Lower bound for dynamic temperature. Temperature never drops below this value."
                />
                <GenerationSlider
                  label="Max Temp"
                  value={max_temp}
                  min={0}
                  max={5}
                  step={0.01}
                  onChange={(v) => update('max_temp', v)}
                  description="Upper bound for dynamic temperature. Higher = more variation in randomness between tokens."
                />
                <GenerationSlider
                  label="Dynatemp Exponent"
                  value={dynatemp_exponent}
                  min={0}
                  max={10}
                  step={0.01}
                  onChange={(v) => update('dynatemp_exponent', v)}
                  description="Controls how dynamically temperature swings between the min and max values. Higher = more dramatic swings."
                />
                <GenerationSlider
                  label="XTC Threshold"
                  value={xtc_threshold}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(v) => update('xtc_threshold', v)}
                  description="Drops tokens whose probability exceeds this threshold, forcing the model to pick from surprising alternatives. 0 = disabled."
                />
                <GenerationSlider
                  label="XTC Probability"
                  value={xtc_probability}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(v) => update('xtc_probability', v)}
                  description="Chance that XTC filtering is applied at each step. 0 = never applied. 1 = always applied."
                />
              </>
            )}
            {mode === 'chat' && (
              <p className="text-foreground/35 py-1.5 text-[10px]">
                Dynatemp & XTC settings are text-completion only.
              </p>
            )}
          </InlineSection>

          <InlineSection
            panelId="generation"
            sectionId="penalty-filtering"
            title="Penalty & Filtering"
          >
            {mode === 'text' && (
              <>
                <GenerationSlider
                  label="NSigma"
                  value={nsigma}
                  min={0}
                  max={10}
                  step={0.01}
                  onChange={(v) => update('nsigma', v)}
                  description="Top N Sigma. Keeps only tokens within N standard deviations of the mean probability. 0 = disabled."
                />
                <GenerationSlider
                  label="Min Keep"
                  value={min_keep}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(v) => update('min_keep', v)}
                  description="Minimum number of tokens that always survive filtering, even when a sampler would cut more."
                />
                <GenerationSlider
                  label="Rep Pen Size"
                  value={rep_pen_size}
                  min={0}
                  max={2048}
                  step={1}
                  onChange={(v) => update('rep_pen_size', v)}
                  description="How many recent tokens the repetition penalty considers. 0 = entire context."
                />
              </>
            )}
            {mode === 'chat' && (
              <p className="text-foreground/35 py-1.5 text-[10px]">
                Penalty & filtering settings are text-completion only.
              </p>
            )}
          </InlineSection>

          <InlineSection panelId="generation" sectionId="adaptive" title="Adaptive">
            {mode === 'text' && (
              <>
                <GenerationSlider
                  label="Adaptive Target"
                  value={adaptive_target}
                  min={-1}
                  max={1}
                  step={0.01}
                  onChange={(v) => update('adaptive_target', v)}
                  description="Target perplexity for adaptive sampling. Negative = disabled. Values closer to 0 = more deterministic output."
                />
                <GenerationSlider
                  label="Adaptive Decay"
                  value={adaptive_decay}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(v) => update('adaptive_decay', v)}
                  description="How quickly adaptive sampling adjusts toward the target perplexity. Higher = faster adjustment."
                />
              </>
            )}
            {mode === 'chat' && (
              <p className="text-foreground/35 py-1.5 text-[10px]">
                Adaptive sampling settings are text-completion only.
              </p>
            )}
          </InlineSection>

          <InlineSection panelId="generation" sectionId="advanced" title="Advanced">
            {mode === 'text' && (
              <>
                <GenerationSlider
                  label="DRY Multiplier"
                  value={dry_multiplier}
                  min={0}
                  max={10}
                  step={0.1}
                  onChange={(v) => update('dry_multiplier', v)}
                  description="DRY repetition penalty strength. Higher = stronger penalty for repeated phrases. 0 = disabled."
                />
                <GenerationSlider
                  label="DRY Base"
                  value={dry_base}
                  min={0}
                  max={10}
                  step={0.1}
                  onChange={(v) => update('dry_base', v)}
                  description="How aggressively DRY scales penalty with repetition length. Higher = penalty grows faster with each repeat."
                />
                <GenerationSlider
                  label="DRY Allowed Length"
                  value={dry_allowed_length}
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
                          'flex-1 rounded-md border touch-target py-1.5 font-mono text-[10px] transition-all sm:py-0.5',
                          mirostat_mode === m
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
                {mirostat_mode !== 0 && (
                  <>
                    <GenerationSlider
                      label="Mirostat Tau"
                      value={mirostat_tau}
                      min={0}
                      max={10}
                      step={0.1}
                      onChange={(v) => update('mirostat_tau', v)}
                      description="Target perplexity for Mirostat. Lower = more focused and coherent. Higher = more diverse and creative."
                    />
                    <GenerationSlider
                      label="Mirostat Eta"
                      value={mirostat_eta}
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
                  value={smoothing_factor}
                  min={0}
                  max={10}
                  step={0.1}
                  onChange={(v) => update('smoothing_factor', v)}
                  description="Smooths the probability distribution for more natural word choices. Higher = smoother distribution."
                />
                <GenerationSlider
                  label="Epsilon Cutoff"
                  value={epsilon_cutoff}
                  min={0}
                  max={9}
                  step={0.01}
                  onChange={(v) => update('epsilon_cutoff', v)}
                  description="Hard cutoff: removes any word with probability below this value. 0 = disabled."
                />
                <GenerationSlider
                  label="Eta Cutoff"
                  value={eta_cutoff}
                  min={0}
                  max={20}
                  step={0.01}
                  onChange={(v) => update('eta_cutoff', v)}
                  description="Softer version of epsilon cutoff. 0 = disabled. Lower = more aggressive filtering."
                />
                <div className="flex items-center justify-between touch-target py-1 sm:py-0.5">
                  <label className="mono-tag text-foreground/60">Temperature Last</label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={temperature_last}
                    onClick={() => update('temperature_last', !temperature_last)}
                    className={cn(
                      'relative h-5 w-9 overflow-hidden rounded-full transition-colors duration-200 sm:h-4 sm:w-7',
                      temperature_last ? 'bg-ember/60' : 'bg-border',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 sm:h-3 sm:w-3',
                        temperature_last ? 'translate-x-4 sm:translate-x-3' : 'translate-x-0',
                      )}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between touch-target py-1 sm:py-0.5">
                  <label className="mono-tag text-foreground/60">Do Sample</label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={do_sample}
                    onClick={() => update('do_sample', !do_sample)}
                    className={cn(
                      'relative h-5 w-9 overflow-hidden rounded-full transition-colors duration-200 sm:h-4 sm:w-7',
                      do_sample ? 'bg-ember/60' : 'bg-border',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 sm:h-3 sm:w-3',
                        do_sample ? 'translate-x-4 sm:translate-x-3' : 'translate-x-0',
                      )}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between touch-target py-1 sm:py-0.5">
                  <label className="mono-tag text-foreground/60">Early Stopping</label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={early_stopping}
                    onClick={() => update('early_stopping', !early_stopping)}
                    className={cn(
                      'relative h-5 w-9 overflow-hidden rounded-full transition-colors duration-200 sm:h-4 sm:w-7',
                      early_stopping ? 'bg-ember/60' : 'bg-border',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 sm:h-3 sm:w-3',
                        early_stopping ? 'translate-x-4 sm:translate-x-3' : 'translate-x-0',
                      )}
                    />
                  </button>
                </div>
              </>
            )}
            {mode === 'chat' && (
              <p className="text-foreground/35 py-1.5 text-[10px]">
                Advanced settings are text-completion only.
              </p>
            )}
          </InlineSection>

          {mode === 'text' && (
            <InlineSection
              panelId="generation"
              sectionId="sampler-priority"
              title="Sampler Priority"
            >
              <div className="space-y-0.5">
                {ALL_SAMPLERS.map((sampler) => {
                  const active = samplers.includes(sampler);
                  const idx = samplers.indexOf(sampler);
                  return (
                    <div
                      key={sampler}
                      className={cn(
                        'flex items-center gap-1 touch-target rounded px-1 py-1 sm:py-0.5',
                        active && 'bg-ember/[0.03]',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleMoveUp(sampler)}
                        disabled={!active || idx === 0}
                        className={cn(
                          'text-foreground/30 hover:text-foreground/60 rounded touch-target h-auto p-1 transition-colors',
                          'disabled:cursor-not-allowed disabled:opacity-20',
                        )}
                        aria-label={'Move ' + sampler + ' up'}
                      >
                        <ChevronUp className="h-2.5 w-2.5" strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(sampler)}
                        disabled={!active || idx === samplers.length - 1}
                        className={cn(
                          'text-foreground/30 hover:text-foreground/60 rounded touch-target h-auto p-1 transition-colors',
                          'disabled:cursor-not-allowed disabled:opacity-20',
                        )}
                        aria-label={'Move ' + sampler + ' down'}
                      >
                        <ChevronDown className="h-2.5 w-2.5" strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleSampler(sampler)}
                        className={cn(
                          'rounded-md border touch-target px-1.5 py-1 font-mono text-[10px] transition-all sm:py-0.5',
                          active
                            ? 'bg-ember/15 text-ember border-ember/25'
                            : 'border-border text-foreground/40 hover:text-foreground/60',
                        )}
                      >
                        {active ? 'on' : 'off'}
                      </button>
                      <span
                        className={cn(
                          'mono-tag text-[10px]',
                          active ? 'text-foreground/80' : 'text-foreground/40',
                        )}
                      >
                        {SAMPLER_LABELS[sampler] ?? sampler}
                      </span>
                    </div>
                  );
                })}
              </div>
            </InlineSection>
          )}

          <InlineSection panelId="generation" sectionId="output" title="Output">
            <GenerationSlider
              label="Max Tokens"
              value={max_tokens}
              min={1}
              max={8192}
              step={1}
              onChange={(v) => update('max_tokens', v)}
              description="Maximum number of tokens to generate. Higher = longer possible response."
            />
            <GenerationSlider
              label="Context Size"
              value={max_context}
              min={512}
              max={131072}
              step={512}
              onChange={(v) => update('max_context', v)}
              description="Maximum context window size in tokens. Higher = more conversation history retained. Set to match your model's context length."
            />
            {mode === 'text' && (
              <GenerationSlider
                label="Min Tokens"
                value={min_tokens}
                min={0}
                max={2048}
                step={1}
                onChange={(v) => update('min_tokens', v)}
                description="Minimum tokens before the response stops. Useful for ensuring complete answers."
              />
            )}
            {mode === 'text' && (
              <>
                <GenerationSlider
                  label="No Repeat Ngram Size"
                  value={no_repeat_ngram_size}
                  min={0}
                  max={20}
                  step={1}
                  onChange={(v) => update('no_repeat_ngram_size', v)}
                  description="Ngram size that cannot be repeated. 0 = disabled."
                />
                <GenerationSlider
                  label="Guidance Scale"
                  value={guidance_scale}
                  min={1}
                  max={20}
                  step={0.1}
                  onChange={(v) => update('guidance_scale', v)}
                  description="Classifier-free guidance scale. Higher = closer to prompt. 1 = no guidance."
                />
                <GenerationSlider
                  label="Max Length"
                  value={max_length}
                  min={1}
                  max={131072}
                  step={1}
                  onChange={(v) => update('max_length', v)}
                  description="Maximum sequence length for text generation backends."
                />
              </>
            )}
            <div className="space-y-1">
              <label className="mono-tag text-foreground/60">Stop Sequences</label>
              <input
                type="text"
                value={stop.join(', ')}
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
                  'border-border bg-background/60 touch-target h-6 w-full rounded-md border px-2',
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
                value={seed}
                onChange={(e) => update('seed', parseInt(e.target.value, 10) || -1)}
                className={cn(
                  'border-border bg-background/60 touch-target h-6 w-full rounded-md border px-2',
                  'text-foreground/80 text-[11px] outline-none',
                  'focus:border-ember/50 focus:ring-ember/20',
                  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                )}
                aria-label="Seed value"
              />
              <p className="text-foreground/30 text-[9px]">-1 for random</p>
            </div>
            <div className="flex items-center justify-between touch-target py-1 sm:py-0.5">
              <label className="mono-tag text-foreground/60">Streaming</label>
              <button
                type="button"
                role="switch"
                aria-checked={streamingEnabled}
                onClick={() => setStreamingEnabled(!streamingEnabled)}
                className={cn(
                  'relative h-5 w-9 overflow-hidden rounded-full transition-colors duration-200 sm:h-4 sm:w-7',
                  streamingEnabled ? 'bg-ember/60' : 'bg-border',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 sm:h-3 sm:w-3',
                    streamingEnabled ? 'translate-x-4 sm:translate-x-3' : 'translate-x-0',
                  )}
                />
              </button>
            </div>
            <div className={cn('space-y-2', !streamingEnabled && 'pointer-events-none opacity-50')}>
              <GenerationSlider
                label="Smooth streaming"
                value={smoothStreaming}
                min={0}
                max={100}
                step={1}
                onChange={(v) => setSmoothStreaming(v)}
                description="0 = instant, 100 = slowest with fade-in per drip."
              />
            </div>
            {mode === 'text' && (
              <>
                <div className="flex items-center justify-between touch-target py-1 sm:py-0.5">
                  <label className="mono-tag text-foreground/60">Ignore EOS Token</label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={ignore_eos_token}
                    onClick={() => update('ignore_eos_token', !ignore_eos_token)}
                    className={cn(
                      'relative h-5 w-9 overflow-hidden rounded-full transition-colors duration-200 sm:h-4 sm:w-7',
                      ignore_eos_token ? 'bg-ember/60' : 'bg-border',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 sm:h-3 sm:w-3',
                        ignore_eos_token ? 'translate-x-4 sm:translate-x-3' : 'translate-x-0',
                      )}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between touch-target py-1 sm:py-0.5">
                  <label className="mono-tag text-foreground/60">
                    Spaces Between Special Tokens
                  </label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={spaces_between_special_tokens}
                    onClick={() =>
                      update('spaces_between_special_tokens', !spaces_between_special_tokens)
                    }
                    className={cn(
                      'relative h-5 w-9 overflow-hidden rounded-full transition-colors duration-200 sm:h-4 sm:w-7',
                      spaces_between_special_tokens ? 'bg-ember/60' : 'bg-border',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 sm:h-3 sm:w-3',
                        spaces_between_special_tokens ? 'translate-x-4 sm:translate-x-3' : 'translate-x-0',
                      )}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between touch-target py-1 sm:py-0.5">
                  <label className="mono-tag text-foreground/60">Speculative Ngram</label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={speculative_ngram}
                    onClick={() => update('speculative_ngram', !speculative_ngram)}
                    className={cn(
                      'relative h-5 w-9 overflow-hidden rounded-full transition-colors duration-200 sm:h-4 sm:w-7',
                      speculative_ngram ? 'bg-ember/60' : 'bg-border',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 sm:h-3 sm:w-3',
                        speculative_ngram ? 'translate-x-4 sm:translate-x-3' : 'translate-x-0',
                      )}
                    />
                  </button>
                </div>
                <div className="space-y-1">
                  <label className="mono-tag text-foreground/60">Negative Prompt</label>
                  <input
                    type="text"
                    value={negative_prompt}
                    onChange={(e) => update('negative_prompt', e.target.value)}
                    placeholder="optional negative prompt"
                    className={cn(
                      'border-border bg-background/60 touch-target h-6 w-full rounded-md border px-2',
                      'text-foreground/80 placeholder:text-foreground/25 text-[11px] outline-none',
                      'focus:border-ember/50',
                    )}
                    aria-label="Negative prompt"
                  />
                </div>
                <div className="space-y-1">
                  <label className="mono-tag text-foreground/60">Grammar String</label>
                  <input
                    type="text"
                    value={grammar_string}
                    onChange={(e) => update('grammar_string', e.target.value)}
                    placeholder="optional grammar约束"
                    className={cn(
                      'border-border bg-background/60 touch-target h-6 w-full rounded-md border px-2',
                      'text-foreground/80 placeholder:text-foreground/25 text-[11px] outline-none',
                      'focus:border-ember/50',
                    )}
                    aria-label="Grammar string"
                  />
                </div>
                <div className="space-y-1">
                  <label className="mono-tag text-foreground/60">Banned Tokens</label>
                  <input
                    type="text"
                    value={banned_tokens}
                    onChange={(e) => update('banned_tokens', e.target.value)}
                    placeholder="comma separated tokens"
                    className={cn(
                      'border-border bg-background/60 touch-target h-6 w-full rounded-md border px-2',
                      'text-foreground/80 placeholder:text-foreground/25 text-[11px] outline-none',
                      'focus:border-ember/50',
                    )}
                    aria-label="Banned tokens"
                  />
                </div>
              </>
            )}
          </InlineSection>
        </div>
      </div>
    </aside>
  );
}
