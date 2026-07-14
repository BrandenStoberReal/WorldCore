import { create } from "zustand";

export type SectionId =
  | "welcome"
  | "characters"
  | "chats"
  | "worldinfo"
  | "settings"
  | "extensions"
  | "connections";

export type DrawerSlot = "left" | "right";

export interface NavState {
  sectionId: SectionId;
  leftDrawer: SectionId | null;
  rightDrawer: SectionId | null;
  inlineDrawers: Record<string, boolean>;
  openSection: (id: SectionId) => void;
  openLeftDrawer: (id: SectionId) => void;
  openRightDrawer: (id: SectionId) => void;
  closeLeftDrawer: () => void;
  closeRightDrawer: () => void;
  toggleInline: (panelId: string, sectionId: string) => void;
}

export const useNavStore = create<NavState>((set) => ({
  sectionId: "welcome",
  leftDrawer: null,
  rightDrawer: null,
  inlineDrawers: {},
  openSection: (id) => set({ sectionId: id }),
  openLeftDrawer: (id) => set({ leftDrawer: id }),
  openRightDrawer: (id) => set({ rightDrawer: id }),
  closeLeftDrawer: () => set({ leftDrawer: null }),
  closeRightDrawer: () => set({ rightDrawer: null }),
  toggleInline: (panelId, sectionId) =>
    set((state) => {
      const key = `${panelId}/${sectionId}`;
      return {
        inlineDrawers: { ...state.inlineDrawers, [key]: !state.inlineDrawers[key] },
      };
    }),
}));
