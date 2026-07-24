import { create } from 'zustand';

export type SectionId =
  | 'characters'
  | 'character-editor'
  | 'chats'
  | 'worldinfo'
  | 'extensions'
  | 'connections'
  | 'textoptions'
  | 'lorebook'
  | 'settings'
  | 'ui-settings';

/** Top drawers fold down from the top bar */
export type TopDrawerId =
  'worldinfo' | 'extensions' | 'connections' | 'textoptions' | 'settings' | 'ui-settings';

const STORAGE_KEY = 'worldcore/nav';

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
        alwaysShowViewportNavbar: state.alwaysShowViewportNavbar,
      }),
    );
  } catch {
    /* noop */
  }
}

export interface NavState {
  sectionId: SectionId;
  prevSectionId: SectionId | null;
  topDrawer: TopDrawerId | null;
  charactersOpen: boolean;
  genSidebarOpen: boolean;
  inlineDrawers: Record<string, boolean>;
  connected: boolean;
  alwaysShowViewportNavbar: boolean;
  setConnected: (next: boolean) => void;
  openSection: (id: SectionId) => void;
  openTopDrawer: (id: TopDrawerId) => void;
  closeTopDrawer: () => void;
  toggleCharacters: () => void;
  closeCharacters: () => void;
  toggleGenSidebar: () => void;
  toggleInline: (panelId: string, sectionId: string) => void;
  setAlwaysShowViewportNavbar: (value: boolean) => void;
}

const persisted = loadPersisted();

export const useNavStore = create<NavState>((set, get) => ({
  sectionId: 'chats',
  prevSectionId: null,
  topDrawer: null,
  charactersOpen: persisted.charactersOpen ?? true,
  genSidebarOpen: persisted.genSidebarOpen ?? true,
  inlineDrawers: {},
  connected: false,
  alwaysShowViewportNavbar: persisted.alwaysShowViewportNavbar ?? false,
  setConnected: (next) => set({ connected: next }),
  openSection: (id) => set({ sectionId: id, topDrawer: null, prevSectionId: null }),
  openTopDrawer: (id) =>
    set((state) => {
      if (state.topDrawer === id) {
        return {
          topDrawer: null,
          sectionId: state.prevSectionId ?? 'chats',
          prevSectionId: null,
        };
      }
      return {
        topDrawer: id,
        sectionId: id,
        prevSectionId: state.topDrawer === null ? state.sectionId : state.prevSectionId,
      };
    }),
  closeTopDrawer: () =>
    set((state) => ({
      topDrawer: null,
      sectionId: state.prevSectionId ?? state.sectionId,
      prevSectionId: null,
    })),
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
  setAlwaysShowViewportNavbar: (value) => {
    set((state) => {
      const next = { alwaysShowViewportNavbar: value };
      persist({ ...state, ...next });
      return next;
    });
  },
}));
