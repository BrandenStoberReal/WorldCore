import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage } from '@/shared/types/chat';
import {
  apiGet,
  getPreset,
  getSettings,
  listPresets,
  savePreset,
  saveSettings,
  saveSettingsPatch,
} from '@/lib/api';
import { emit } from '@/lib/extensionEventBus';

export type Theme = 'light' | 'dark' | 'system';

export interface User {
  id: string;
  name: string;
  role: string;
  avatarPath?: string;
}

/** Shape returned by the backend `GET /users/me` handler. */
interface MeResponse {
  id?: string;
  handle?: string;
  name?: string;
  admin?: boolean;
  avatar?: string;
}

export interface AppStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  streamingEnabled: boolean; // user preference: SSE vs whole-response transport
  smoothStreaming: number; // 0-100 slider; 0=instant, 100=slowest with fade-in
  setStreamingEnabled: (enabled: boolean) => void;
  setSmoothStreaming: (value: number) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  initUser: () => Promise<void>;
  initSettings: () => Promise<void>;
}

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

export const useAppStore = create<AppStore>((set) => ({
  theme: 'system',
  setTheme: (theme) => {
    set({ theme });
    void saveSettingsPatch({ theme }).catch(() => {});
  },
  streamingEnabled: true,
  smoothStreaming: 50,
  setStreamingEnabled: (enabled) => {
    set({ streamingEnabled: enabled });
    void saveSettingsPatch({ streamingEnabled: enabled }).catch(() => {});
  },
  setSmoothStreaming: (value) => {
    // clamp to 0-100
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    set({ smoothStreaming: clamped });
    void saveSettingsPatch({ smoothStreaming: clamped }).catch(() => {});
  },
  user: null,
  setUser: (user) => set({ user }),
  initUser: async () => {
    try {
      const me = await apiGet<MeResponse>('/users/me');
      const user: User = {
        id: me.id ?? 'default-user',
        name: me.name ?? me.handle ?? '',
        role: me.admin ? 'admin' : 'user',
        avatarPath: me.avatar || undefined,
      };
      set({ user });
      emit('user_initialized', { userId: user.id });
    } catch {
      /* leave user null if backend unreachable */
    }
  },
  initSettings: async () => {
    try {
      const settings = await getSettings<Record<string, unknown>>();
      if (typeof settings === 'object' && settings !== null) {
        if (isTheme(settings.theme)) {
          set({ theme: settings.theme });
        }
        if (typeof settings.streamingEnabled === 'boolean') {
          set({ streamingEnabled: settings.streamingEnabled });
        }
        if (typeof settings.smoothStreaming === 'number') {
          set({
            smoothStreaming: Math.max(0, Math.min(100, Math.round(settings.smoothStreaming))),
          });
        }
      }
    } catch {
      /* leave defaults if backend unreachable */
    }
  },
}));

export type GenerationMode = 'chat' | 'text';

const SHARED_DEFAULTS = {
  temperature: 0.7,
  top_p: 0.5,
  top_k: 40,
  max_tokens: 4096,
  max_context: 8192,
  seed: -1,
  stop: [] as string[],
} as const;

const CHAT_DEFAULTS = {
  frequency_penalty: 0,
  presence_penalty: 0,
  min_tokens: 0,
} as const;

const LLAMACPP_DEFAULT_SAMPLERS = [
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

const TEXT_DEFAULTS = {
  min_p: 0,
  typical_p: 1,
  top_a: 0,
  tfs: 1,
  rep_pen: 1.2,
  rep_pen_range: 0,
  rep_pen_slope: 0,
  dry_multiplier: 0,
  dry_base: 1.75,
  dry_allowed_length: 2,
  mirostat_mode: 0,
  mirostat_tau: 5,
  mirostat_eta: 0.1,
  smoothing_factor: 0,
  smoothing_curve: 0,
  epsilon_cutoff: 0,
  eta_cutoff: 0,
  rep_pen_decay: 0,
  dry_penalty_last_n: -1,
  dry_sequence_breakers: '',
  min_temp: 0,
  max_temp: 0,
  dynatemp_exponent: 1,
  penalty_alpha: 0,
  num_beams: 1,
  length_penalty: 1,
  min_length: 0,
  encoder_rep_pen: 1,
  skew: 0,
  xtc_threshold: 0.1,
  xtc_probability: 0,
  nsigma: 0,
  min_keep: 0,
  rep_pen_size: 0,
  adaptive_target: 0,
  adaptive_decay: 0,
  samplers: [...LLAMACPP_DEFAULT_SAMPLERS] as string[],
  skip_special_tokens: true,
  add_bos_token: true,
  ban_eos_token: false,
  temperature_last: false,
  no_repeat_ngram_size: 0,
  do_sample: true,
  early_stopping: false,
  dynatemp: false,
  guidance_scale: 1,
  negative_prompt: '',
  grammar_string: '',
  json_schema: {} as Record<string, unknown>,
  json_schema_allow_empty: false,
  banned_tokens: '',
  sampler_priority: [] as string[],
  samplers_priorities: [] as string[],
  ignore_eos_token: false,
  spaces_between_special_tokens: false,
  speculative_ngram: false,
  sampler_order: [] as number[],
  logit_bias: [] as Array<[number, number]>,
  max_length: 4096,
} as const;

export const CHAT_GEN_DEFAULTS = { ...SHARED_DEFAULTS, ...CHAT_DEFAULTS } as const;
export const TEXT_GEN_DEFAULTS = { ...SHARED_DEFAULTS, ...TEXT_DEFAULTS } as const;

export interface GenerationState {
  mode: GenerationMode;

  temperature: number;
  top_p: number;
  top_k: number;
  max_tokens: number;
  seed: number;
  stop: string[];

  frequency_penalty: number;
  presence_penalty: number;
  min_tokens: number;

  min_p: number;
  typical_p: number;
  top_a: number;
  tfs: number;
  rep_pen: number;
  rep_pen_range: number;
  rep_pen_slope: number;
  dry_multiplier: number;
  dry_base: number;
  dry_allowed_length: number;
  mirostat_mode: number;
  mirostat_tau: number;
  mirostat_eta: number;
  smoothing_factor: number;
  smoothing_curve: number;
  epsilon_cutoff: number;
  eta_cutoff: number;
  rep_pen_decay: number;
  dry_penalty_last_n: number;
  dry_sequence_breakers: string;
  min_temp: number;
  max_temp: number;
  dynatemp_exponent: number;
  penalty_alpha: number;
  num_beams: number;
  length_penalty: number;
  min_length: number;
  encoder_rep_pen: number;
  skew: number;
  xtc_threshold: number;
  xtc_probability: number;
  nsigma: number;
  min_keep: number;
  rep_pen_size: number;
  adaptive_target: number;
  adaptive_decay: number;
  max_context: number;

  samplers: string[];

  skip_special_tokens: boolean;
  add_bos_token: boolean;
  ban_eos_token: boolean;

  temperature_last: boolean;
  no_repeat_ngram_size: number;
  do_sample: boolean;
  early_stopping: boolean;
  dynatemp: boolean;
  guidance_scale: number;
  negative_prompt: string;
  grammar_string: string;
  json_schema: Record<string, unknown>;
  json_schema_allow_empty: boolean;
  banned_tokens: string;
  sampler_priority: string[];
  samplers_priorities: string[];
  ignore_eos_token: boolean;
  spaces_between_special_tokens: boolean;
  speculative_ngram: boolean;
  sampler_order: number[];
  logit_bias: Array<[number, number]>;
  max_length: number;

  model: string;
  preset: string;

  setMode: (mode: GenerationMode) => void;
  updateParam: <K extends keyof GenerationState>(key: K, value: GenerationState[K]) => void;
  resetDefaults: () => void;
  loadPreset: (preset: Partial<GenerationState>) => void;
  savePresetToBackend: (name: string) => Promise<void>;
  loadPresetFromBackend: (name: string) => Promise<void>;
  listAvailablePresets: () => Promise<string[]>;
}

type GenerationParams = Pick<
  GenerationState,
  | 'mode'
  | 'temperature'
  | 'top_p'
  | 'top_k'
  | 'max_tokens'
  | 'seed'
  | 'stop'
  | 'frequency_penalty'
  | 'presence_penalty'
  | 'min_tokens'
  | 'min_p'
  | 'typical_p'
  | 'top_a'
  | 'tfs'
  | 'rep_pen'
  | 'rep_pen_range'
  | 'rep_pen_slope'
  | 'dry_multiplier'
  | 'dry_base'
  | 'dry_allowed_length'
  | 'mirostat_mode'
  | 'mirostat_tau'
  | 'mirostat_eta'
  | 'smoothing_factor'
  | 'smoothing_curve'
  | 'epsilon_cutoff'
  | 'eta_cutoff'
  | 'rep_pen_decay'
  | 'dry_penalty_last_n'
  | 'dry_sequence_breakers'
  | 'min_temp'
  | 'max_temp'
  | 'dynatemp_exponent'
  | 'penalty_alpha'
  | 'num_beams'
  | 'length_penalty'
  | 'min_length'
  | 'encoder_rep_pen'
  | 'skew'
  | 'xtc_threshold'
  | 'xtc_probability'
  | 'nsigma'
  | 'min_keep'
  | 'rep_pen_size'
  | 'adaptive_target'
  | 'adaptive_decay'
  | 'max_context'
  | 'samplers'
  | 'skip_special_tokens'
  | 'add_bos_token'
  | 'ban_eos_token'
  | 'temperature_last'
  | 'no_repeat_ngram_size'
  | 'do_sample'
  | 'early_stopping'
  | 'dynatemp'
  | 'guidance_scale'
  | 'negative_prompt'
  | 'grammar_string'
  | 'json_schema'
  | 'json_schema_allow_empty'
  | 'banned_tokens'
  | 'sampler_priority'
  | 'samplers_priorities'
  | 'ignore_eos_token'
  | 'spaces_between_special_tokens'
  | 'speculative_ngram'
  | 'sampler_order'
  | 'logit_bias'
  | 'max_length'
  | 'model'
  | 'preset'
>;

export const PARAM_KEYS = [
  'mode',
  'temperature',
  'top_p',
  'top_k',
  'max_tokens',
  'seed',
  'stop',
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
  'smoothing_curve',
  'epsilon_cutoff',
  'eta_cutoff',
  'rep_pen_decay',
  'dry_penalty_last_n',
  'dry_sequence_breakers',
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
  'max_context',
  'samplers',
  'skip_special_tokens',
  'add_bos_token',
  'ban_eos_token',
  'temperature_last',
  'no_repeat_ngram_size',
  'do_sample',
  'early_stopping',
  'dynatemp',
  'guidance_scale',
  'negative_prompt',
  'grammar_string',
  'json_schema',
  'json_schema_allow_empty',
  'banned_tokens',
  'sampler_priority',
  'samplers_priorities',
  'ignore_eos_token',
  'spaces_between_special_tokens',
  'speculative_ngram',
  'sampler_order',
  'logit_bias',
  'max_length',
  'model',
  'preset',
] as const satisfies readonly (keyof GenerationParams)[];

const FIELD_ALIASES: Record<string, string> = {
  temp: 'temperature',
  freq_pen: 'frequency_penalty',
  presence_pen: 'presence_penalty',
};

function extractParams(value: unknown): Partial<GenerationParams> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const out: Partial<GenerationParams> = {};
  for (const key of PARAM_KEYS) {
    if (key === 'mode' || key === 'preset') continue;
    if (key in raw) {
      (out as Record<string, unknown>)[key] = raw[key];
    }
  }
  for (const [alias, canonical] of Object.entries(FIELD_ALIASES)) {
    if (alias in raw && !(canonical in out)) {
      (out as Record<string, unknown>)[canonical] = raw[alias];
    }
  }
  return out;
}

export const useGenerationStore = create<GenerationState>()(
  persist(
    (set, get) => ({
      mode: 'chat',

      ...SHARED_DEFAULTS,
      ...CHAT_DEFAULTS,
      ...TEXT_DEFAULTS,

      model: '',
      preset: 'Default',

      setMode: (mode) => {
        const defaults = mode === 'chat' ? CHAT_GEN_DEFAULTS : TEXT_GEN_DEFAULTS;
        set({ mode, ...defaults });
      },

      updateParam: (key, value) => set({ [key]: value } as Partial<GenerationState>),

      resetDefaults: () => {
        const { mode } = get();
        const defaults = mode === 'chat' ? CHAT_GEN_DEFAULTS : TEXT_GEN_DEFAULTS;
        set({ ...defaults });
      },

      loadPreset: (preset) => set(preset),

      savePresetToBackend: async (name) => {
        const trimmed = name.trim();
        if (!trimmed) throw new Error('Preset name is required');
        const state = get();
        const data: Record<string, unknown> = { name: trimmed };
        for (const key of PARAM_KEYS) {
          data[key] = state[key] as unknown;
        }
        await savePreset({ name: trimmed, category: 'generation', data });
        set({ preset: trimmed });
      },

      loadPresetFromBackend: async (name) => {
        const trimmed = name.trim();
        if (!trimmed) throw new Error('Preset name is required');
        let result: unknown = null;
        try {
          result = await getPreset('generation', trimmed);
        } catch (err) {
          if (!(err instanceof Error && /404|not\s*found/i.test(err.message))) throw err;
        }
        if (!result) {
          try {
            result = await getPreset('textgenerationwebui', trimmed);
          } catch (err) {
            if (!(err instanceof Error && /404|not\s*found/i.test(err.message))) throw err;
          }
        }
        const params = extractParams(
          result && typeof result === 'object' && 'data' in result
            ? (result as { data: unknown }).data
            : result,
        );
        if (Object.keys(params).length === 0) {
          throw new Error(`Preset "${trimmed}" has no loadable params`);
        }
        set({ ...params, preset: trimmed });
      },

      listAvailablePresets: async () => {
        const [genPresets, tgPresets] = await Promise.all([
          listPresets('generation'),
          listPresets('textgenerationwebui'),
        ]);
        const names = new Set<string>();
        for (const entry of [...genPresets, ...tgPresets]) {
          if (!entry || typeof entry !== 'object') continue;
          const raw = entry as Record<string, unknown>;
          let name: unknown;
          if (raw.data && typeof raw.data === 'object') {
            name = (raw.data as Record<string, unknown>).name;
          } else {
            name = raw.name;
          }
          if (typeof name === 'string' && name.length > 0) names.add(name);
        }
        return [...names].sort();
      },
    }),
    {
      name: 'worldcore/generation',
      partialize: (state): Partial<GenerationParams> => {
        const persisted: Record<string, unknown> = {};
        for (const key of PARAM_KEYS) {
          persisted[key] = state[key];
        }
        return persisted as Partial<GenerationParams>;
      },
    },
  ),
);

export interface ChatStore {
  activeChatId: string | null;
  activeCharacterId: number | null;
  messages: ChatMessage[];
  isGenerating: boolean;
  streamingContent: string;
  streamingThinking: string | undefined;
  isThinkingStream: boolean;
  streamingSendDate: string;
  setActiveChat: (id: string | null) => void;
  setActiveCharacter: (id: number | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  removeMessage: (index: number) => void;
  setStreamingContent: (content: string) => void;
  setStreamingThinking: (thinking: string | undefined) => void;
  setIsThinkingStream: (inThinking: boolean) => void;
  appendStreamingContent: (content: string) => void;
  startStreaming: () => void;
  commitStreaming: (name: string, parsed?: { mes: string; thinking?: string }) => void;
  setIsGenerating: (generating: boolean) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  activeChatId: null,
  activeCharacterId: null,
  messages: [],
  isGenerating: false,
  streamingContent: '',
  streamingThinking: undefined,
  isThinkingStream: false,
  streamingSendDate: '',
  setActiveChat: (id) => {
    set({ activeChatId: id });
    emit('chat_changed', { chatId: id });
  },
  setActiveCharacter: (id) => {
    set({
      activeCharacterId: id,
      activeChatId: null,
      messages: [],
      streamingContent: '',
      streamingThinking: undefined,
      isThinkingStream: false,
    });
    emit('character_changed', { characterId: id });
  },
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }));
    emit('new_message', message);
  },
  removeMessage: (index) => {
    set((state) => ({ messages: state.messages.filter((_, i) => i !== index) }));
    emit('message_removed', { index });
  },
  setStreamingContent: (content) => set({ streamingContent: content }),
  setStreamingThinking: (thinking) => set({ streamingThinking: thinking }),
  setIsThinkingStream: (inThinking) => set({ isThinkingStream: inThinking }),
  appendStreamingContent: (content) =>
    set((state) => ({ streamingContent: state.streamingContent + content })),
  startStreaming: () => set({ streamingSendDate: new Date().toISOString() }),
  commitStreaming: (name, parsed) =>
    set((state) => {
      const source = parsed?.mes ?? state.streamingContent;
      if (!source) return {};
      const msg: ChatMessage = {
        name,
        is_user: false,
        mes: source,
        thinking: parsed?.thinking,
        send_date: state.streamingSendDate || new Date().toISOString(),
        extra: {},
      };
      return {
        messages: [...state.messages, msg],
        streamingContent: '',
        streamingThinking: undefined,
        isThinkingStream: false,
        streamingSendDate: '',
      };
    }),
  setIsGenerating: (generating) => set({ isGenerating: generating }),
  clearChat: () =>
    set({
      activeChatId: null,
      messages: [],
      streamingContent: '',
      streamingThinking: undefined,
      isThinkingStream: false,
    }),
}));
