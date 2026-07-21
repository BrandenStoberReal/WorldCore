import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage } from '@/shared/types/chat';
import { apiGet, getPreset, getSettings, listPresets, savePreset, saveSettings } from '@/lib/api';

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
  user: User | null;
  setUser: (user: User | null) => void;
  initUser: () => Promise<void>;
  initTheme: () => Promise<void>;
}

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

export const useAppStore = create<AppStore>((set) => ({
  theme: 'system',
  setTheme: (theme) => {
    set({ theme });
    void saveSettings({ theme }).catch(() => {});
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
    } catch {
      /* leave user null if backend unreachable */
    }
  },
  initTheme: async () => {
    try {
      const settings = await getSettings<Record<string, unknown>>();
      if (typeof settings === 'object' && settings !== null && isTheme(settings.theme)) {
        set({ theme: settings.theme });
      }
    } catch {
      /* leave default 'system' theme if backend unreachable */
    }
  },
}));

export type GenerationMode = 'chat' | 'text';

const SHARED_DEFAULTS = {
  temperature: 1,
  top_p: 1,
  top_k: 50,
  max_tokens: 4096,
  seed: -1,
  streaming: true,
  stop: [] as string[],
} as const;

const CHAT_DEFAULTS = {
  frequency_penalty: 0,
  presence_penalty: 0,
  min_tokens: 0,
} as const;

const TEXT_DEFAULTS = {
  min_p: 0,
  typical_p: 1,
  top_a: 0,
  tfs: 1,
  rep_pen: 1,
  rep_pen_range: 0,
  rep_pen_slope: 0,
  dry_multiplier: 0,
  dry_base: 1.75,
  dry_allowed_length: 0,
  mirostat_mode: 0,
  mirostat_tau: 5,
  mirostat_eta: 0.1,
  smoothing_factor: 0,
  epsilon_cutoff: 0,
  eta_cutoff: 0,
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
  streaming: boolean;
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
  epsilon_cutoff: number;
  eta_cutoff: number;

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
  | 'streaming'
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
  | 'epsilon_cutoff'
  | 'eta_cutoff'
  | 'model'
  | 'preset'
>;

const PARAM_KEYS = [
  'mode',
  'temperature',
  'top_p',
  'top_k',
  'max_tokens',
  'seed',
  'streaming',
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
  'epsilon_cutoff',
  'eta_cutoff',
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
  setActiveChat: (id: string | null) => void;
  setActiveCharacter: (id: number | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (content: string) => void;
  commitStreaming: (name: string) => void;
  setIsGenerating: (generating: boolean) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  activeChatId: null,
  activeCharacterId: null,
  messages: [],
  isGenerating: false,
  streamingContent: '',
  setActiveChat: (id) => set({ activeChatId: id }),
  setActiveCharacter: (id) => set({ activeCharacterId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setStreamingContent: (content) => set({ streamingContent: content }),
  appendStreamingContent: (content) =>
    set((state) => ({ streamingContent: state.streamingContent + content })),
  commitStreaming: (name) =>
    set((state) => {
      if (!state.streamingContent) return {};
      const msg: ChatMessage = {
        name,
        is_user: false,
        mes: state.streamingContent,
        send_date: new Date().toISOString(),
        extra: {},
      };
      return { messages: [...state.messages, msg], streamingContent: '' };
    }),
  setIsGenerating: (generating) => set({ isGenerating: generating }),
  clearChat: () => set({ activeChatId: null, messages: [], streamingContent: '' }),
}));
