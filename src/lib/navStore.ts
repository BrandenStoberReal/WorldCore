import { create } from "zustand";

export type SectionId =
  | "characters"
  | "chats"
  | "worldinfo"
  | "settings"
  | "extensions"
  | "connections"
  | "textoptions";

/** Top drawers fold down from the top bar */
export type TopDrawerId = "worldinfo" | "extensions" | "connections" | "settings" | "textoptions";

export interface NavState {
  sectionId: SectionId;
  topDrawer: TopDrawerId | null;
  charactersOpen: boolean;
  inlineDrawers: Record<string, boolean>;
  openSection: (id: SectionId) => void;
  openTopDrawer: (id: TopDrawerId) => void;
  closeTopDrawer: () => void;
  toggleCharacters: () => void;
  closeCharacters: () => void;
  toggleInline: (panelId: string, sectionId: string) => void;
}

export const useNavStore = create<NavState>((set) => ({
  sectionId: "chats",
  topDrawer: null,
  charactersOpen: false,
  inlineDrawers: {},
  openSection: (id) => set({ sectionId: id, topDrawer: null }),
  openTopDrawer: (id) =>
    set((state) => ({
      topDrawer: state.topDrawer === id ? null : id,
      sectionId: id,
    })),
  closeTopDrawer: () => set({ topDrawer: null }),
  toggleCharacters: () => set((state) => ({ charactersOpen: !state.charactersOpen })),
  closeCharacters: () => set({ charactersOpen: false }),
  toggleInline: (panelId, sectionId) =>
    set((state) => {
      const key = `${panelId}/${sectionId}`;
      return {
        inlineDrawers: { ...state.inlineDrawers, [key]: !state.inlineDrawers[key] },
      };
    }),
}));
