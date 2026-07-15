import { create } from "zustand";

export type SectionId =
  | "characters"
  | "chats"
  | "worldinfo"
  | "extensions"
  | "connections"
  | "textoptions";

/** Top drawers fold down from the top bar */
export type TopDrawerId = "worldinfo" | "extensions" | "connections" | "textoptions";

const STORAGE_KEY = "worldcore/nav";

function loadPersisted(): Partial<NavState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persist(state: NavState) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        charactersOpen: state.charactersOpen,
        genSidebarOpen: state.genSidebarOpen,
      }),
    );
  } catch { /* noop */ }
}

export interface NavState {
  sectionId: SectionId;
  topDrawer: TopDrawerId | null;
  charactersOpen: boolean;
  genSidebarOpen: boolean;
  inlineDrawers: Record<string, boolean>;
  openSection: (id: SectionId) => void;
  openTopDrawer: (id: TopDrawerId) => void;
  closeTopDrawer: () => void;
  toggleCharacters: () => void;
  closeCharacters: () => void;
  toggleGenSidebar: () => void;
  toggleInline: (panelId: string, sectionId: string) => void;
}

const persisted = loadPersisted();

export const useNavStore = create<NavState>((set, get) => ({
  sectionId: "worldinfo",
  topDrawer: null,
  charactersOpen: persisted.charactersOpen ?? false,
  genSidebarOpen: persisted.genSidebarOpen ?? true,
  inlineDrawers: {},
  openSection: (id) => set({ sectionId: id, topDrawer: null }),
  openTopDrawer: (id) =>
    set((state) => ({
      topDrawer: state.topDrawer === id ? null : id,
      sectionId: id,
    })),
  closeTopDrawer: () => set({ topDrawer: null }),
  toggleCharacters: () => {
    set((state) => {
      const next = { charactersOpen: !state.charactersOpen };
      persist({ ...state, ...next });
      return next;
    });
  },
  closeCharacters: () => {
    set((state) => {
      const next = { charactersOpen: false };
      persist({ ...state, ...next });
      return next;
    });
  },
  toggleGenSidebar: () => {
    set((state) => {
      const next = { genSidebarOpen: !state.genSidebarOpen };
      persist({ ...state, ...next });
      return next;
    });
  },
  toggleInline: (panelId, sectionId) =>
    set((state) => {
      const key = `${panelId}/${sectionId}`;
      return {
        inlineDrawers: { ...state.inlineDrawers, [key]: !state.inlineDrawers[key] },
      };
    }),
}));
