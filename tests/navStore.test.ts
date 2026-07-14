import { describe, it, expect } from "bun:test";
import { useNavStore } from "../src/lib/navStore";

describe("useNavStore", () => {
  it("defaults to welcome section with no drawers open", () => {
    const state = useNavStore.getState();
    expect(state.sectionId).toBe("welcome");
    expect(state.leftDrawer).toBeNull();
    expect(state.rightDrawer).toBeNull();
    expect(state.inlineDrawers).toEqual({});
  });

  it("openSection sets sectionId", () => {
    useNavStore.getState().openSection("characters");
    expect(useNavStore.getState().sectionId).toBe("characters");
  });

  it("openLeftDrawer is mutually exclusive within left slot", () => {
    useNavStore.getState().openLeftDrawer("characters");
    expect(useNavStore.getState().leftDrawer).toBe("characters");
    useNavStore.getState().openLeftDrawer("worldinfo");
    expect(useNavStore.getState().leftDrawer).toBe("worldinfo");
  });

  it("left and right drawers are independent", () => {
    useNavStore.getState().openLeftDrawer("characters");
    useNavStore.getState().openRightDrawer("settings");
    expect(useNavStore.getState().leftDrawer).toBe("characters");
    expect(useNavStore.getState().rightDrawer).toBe("settings");
  });

  it("closeLeftDrawer sets leftDrawer to null", () => {
    useNavStore.getState().openLeftDrawer("characters");
    useNavStore.getState().closeLeftDrawer();
    expect(useNavStore.getState().leftDrawer).toBeNull();
  });

  it("toggleInline toggles accordion state", () => {
    useNavStore.getState().toggleInline("settings", "sampling");
    expect(useNavStore.getState().inlineDrawers["settings/sampling"]).toBe(true);
    useNavStore.getState().toggleInline("settings", "sampling");
    expect(useNavStore.getState().inlineDrawers["settings/sampling"]).toBe(false);
  });

  it("openSection welcome returns to welcome from any section", () => {
    useNavStore.getState().openSection("characters");
    useNavStore.getState().openSection("welcome");
    expect(useNavStore.getState().sectionId).toBe("welcome");
  });
});
