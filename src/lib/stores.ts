import { create } from "zustand";
import type { ChatMessage } from "@/shared/types/chat";

export type Theme = "light" | "dark" | "system";

export interface User {
  id: number;
  name: string;
  role: string;
  avatarPath?: string;
}

export interface AppStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  theme: "system",
  setTheme: (theme) => set({ theme }),
  user: null,
  setUser: (user) => set({ user }),
}));

export type GenerationMode = "chat" | "text";

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
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  mode: "chat",

  ...SHARED_DEFAULTS,
  ...CHAT_DEFAULTS,
  ...TEXT_DEFAULTS,

  model: "",
  preset: "Default",

  setMode: (mode) => {
    const defaults = mode === "chat" ? CHAT_GEN_DEFAULTS : TEXT_GEN_DEFAULTS;
    set({ mode, ...defaults });
  },

  updateParam: (key, value) => set({ [key]: value } as Partial<GenerationState>),

  resetDefaults: () => {
    const { mode } = get();
    const defaults = mode === "chat" ? CHAT_GEN_DEFAULTS : TEXT_GEN_DEFAULTS;
    set({ ...defaults });
  },

  loadPreset: (preset) => set(preset),
}));

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
  streamingContent: "",
  setActiveChat: (id) => set({ activeChatId: id }),
  setActiveCharacter: (id) => set({ activeCharacterId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setStreamingContent: (content) => set({ streamingContent: content }),
  appendStreamingContent: (content) => set((state) => ({ streamingContent: state.streamingContent + content })),
  commitStreaming: (name) => set((state) => {
    if (!state.streamingContent) return {};
    const msg: ChatMessage = {
      name,
      is_user: false,
      mes: state.streamingContent,
      send_date: new Date().toISOString(),
      extra: {},
    };
    return { messages: [...state.messages, msg], streamingContent: "" };
  }),
  setIsGenerating: (generating) => set({ isGenerating: generating }),
  clearChat: () => set({ activeChatId: null, messages: [], streamingContent: "" }),
}));
