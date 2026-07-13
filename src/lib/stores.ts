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
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeRoute: string;
  setActiveRoute: (route: string) => void;
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  theme: "system",
  setTheme: (theme) => set({ theme }),
  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  activeRoute: "/",
  setActiveRoute: (activeRoute) => set({ activeRoute }),
  user: null,
  setUser: (user) => set({ user }),
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
