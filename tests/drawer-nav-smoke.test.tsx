import { describe, it, expect, beforeEach } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { useNavStore } from "../src/lib/navStore";
import { DrawerShell } from "../src/components/drawers/DrawerShell";
import { CenterPageHost } from "../src/components/drawers/CenterPageHost";
import { NavRail } from "../src/components/drawers/NavRail";
import { DrawerSlot } from "../src/components/drawers/DrawerSlot";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Reset the store to its initial state before every test. */
function resetStore() {
  useNavStore.setState({
    sectionId: "welcome",
    leftDrawer: null,
    rightDrawer: null,
    inlineDrawers: {},
  });
}

/** Render DrawerShell to static markup and return the HTML string. */
function shellHtml(): string {
  return renderToStaticMarkup(<DrawerShell />);
}

/** Render NavRail to static markup. */
function railHtml(): string {
  return renderToStaticMarkup(<NavRail />);
}

/* ------------------------------------------------------------------ */
/*  1. Default state — static HTML structure + store defaults          */
/* ------------------------------------------------------------------ */

describe("Drawer navigation smoke — default state", () => {
  beforeEach(resetStore);

  it("sectionId defaults to 'welcome'", () => {
    expect(useNavStore.getState().sectionId).toBe("welcome");
  });

  it("no left drawer is open", () => {
    expect(useNavStore.getState().leftDrawer).toBeNull();
  });

  it("no right drawer is open", () => {
    expect(useNavStore.getState().rightDrawer).toBeNull();
  });

  it("inlineDrawers is empty", () => {
    expect(useNavStore.getState().inlineDrawers).toEqual({});
  });

  it("DrawerShell renders data-drawer-shell root element", () => {
    const html = shellHtml();
    expect(html).toContain("data-drawer-shell");
  });

  it("NavRail renders data-nav-rail element", () => {
    const html = railHtml();
    expect(html).toContain("data-nav-rail");
  });

  it("NavRail renders all 6 section icons with correct data attributes", () => {
    const html = railHtml();
    expect(html).toContain('data-drawer-icon="characters"');
    expect(html).toContain('data-drawer-icon="worldinfo"');
    expect(html).toContain('data-drawer-icon="extensions"');
    expect(html).toContain('data-drawer-icon="connections"');
    expect(html).toContain('data-drawer-icon="chats"');
    expect(html).toContain('data-drawer-icon="settings"');
  });

  it("DrawerShell has both left and right drawer slots", () => {
    const html = shellHtml();
    expect(html).toContain('data-drawer-slot="left"');
    expect(html).toContain('data-drawer-slot="right"');
  });

  it("no drawer-open class when drawers are closed (static default render)", () => {
    const html = shellHtml();
    expect(html).not.toContain("drawer-open");
  });
});

/* ------------------------------------------------------------------ */
/*  2. DrawerSlot CSS class reflects open prop (pure component test)   */
/* ------------------------------------------------------------------ */

describe("Drawer navigation smoke — DrawerSlot open/close rendering", () => {
  it("applies drawer-open class when open={true}", () => {
    const html = renderToStaticMarkup(
      <DrawerSlot side="left" open={true}>
        <span>content</span>
      </DrawerSlot>,
    );
    expect(html).toContain("drawer-open");
    expect(html).toContain("content");
  });

  it("does not apply drawer-open class when open={false}", () => {
    const html = renderToStaticMarkup(
      <DrawerSlot side="left" open={false}>
        <span>content</span>
      </DrawerSlot>,
    );
    expect(html).not.toContain("drawer-open");
  });

  it("right drawer applies drawer-open class when open={true}", () => {
    const html = renderToStaticMarkup(
      <DrawerSlot side="right" open={true}>
        <span>settings-panel</span>
      </DrawerSlot>,
    );
    expect(html).toContain("drawer-open");
    expect(html).toContain("settings-panel");
  });
});

/* ------------------------------------------------------------------ */
/*  3. Clicking Characters icon opens left drawer (store level)        */
/* ------------------------------------------------------------------ */

describe("Drawer navigation smoke — open Characters left drawer", () => {
  beforeEach(resetStore);

  it("openLeftDrawer('characters') sets leftDrawer to 'characters'", () => {
    useNavStore.getState().openLeftDrawer("characters");
    expect(useNavStore.getState().leftDrawer).toBe("characters");
  });

  it("sectionId remains 'welcome' when only left drawer opens", () => {
    useNavStore.getState().openLeftDrawer("characters");
    expect(useNavStore.getState().sectionId).toBe("welcome");
  });

  it("rightDrawer is unaffected by opening left drawer", () => {
    useNavStore.getState().openLeftDrawer("characters");
    expect(useNavStore.getState().rightDrawer).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  4. Mutual exclusivity: WorldInfo closes Characters                 */
/* ------------------------------------------------------------------ */

describe("Drawer navigation smoke — mutual exclusivity", () => {
  beforeEach(resetStore);

  it("opening WorldInfo replaces Characters in left drawer", () => {
    useNavStore.getState().openLeftDrawer("characters");
    expect(useNavStore.getState().leftDrawer).toBe("characters");

    useNavStore.getState().openLeftDrawer("worldinfo");
    expect(useNavStore.getState().leftDrawer).toBe("worldinfo");
  });

  it("opening Extensions replaces WorldInfo in left drawer", () => {
    useNavStore.getState().openLeftDrawer("worldinfo");
    useNavStore.getState().openLeftDrawer("extensions");
    expect(useNavStore.getState().leftDrawer).toBe("extensions");
  });

  it("opening Connections replaces Extensions in left drawer", () => {
    useNavStore.getState().openLeftDrawer("extensions");
    useNavStore.getState().openLeftDrawer("connections");
    expect(useNavStore.getState().leftDrawer).toBe("connections");
  });

  it("only one left drawer can be open at a time (rapid succession)", () => {
    useNavStore.getState().openLeftDrawer("characters");
    useNavStore.getState().openLeftDrawer("worldinfo");
    useNavStore.getState().openLeftDrawer("extensions");
    useNavStore.getState().openLeftDrawer("connections");
    expect(useNavStore.getState().leftDrawer).toBe("connections");
    // Verify only one value (not an array or merged state)
    expect(typeof useNavStore.getState().leftDrawer).toBe("string");
  });
});

/* ------------------------------------------------------------------ */
/*  5. Settings opens right drawer                                     */
/* ------------------------------------------------------------------ */

describe("Drawer navigation smoke — Settings right drawer", () => {
  beforeEach(resetStore);

  it("openRightDrawer('settings') sets rightDrawer to 'settings'", () => {
    useNavStore.getState().openRightDrawer("settings");
    expect(useNavStore.getState().rightDrawer).toBe("settings");
  });

  it("left and right drawers are independent", () => {
    useNavStore.getState().openLeftDrawer("characters");
    useNavStore.getState().openRightDrawer("settings");
    expect(useNavStore.getState().leftDrawer).toBe("characters");
    expect(useNavStore.getState().rightDrawer).toBe("settings");
  });

  it("closing left does not affect right drawer", () => {
    useNavStore.getState().openLeftDrawer("characters");
    useNavStore.getState().openRightDrawer("settings");
    useNavStore.getState().closeLeftDrawer();
    expect(useNavStore.getState().leftDrawer).toBeNull();
    expect(useNavStore.getState().rightDrawer).toBe("settings");
  });

  it("closing right does not affect left drawer", () => {
    useNavStore.getState().openLeftDrawer("characters");
    useNavStore.getState().openRightDrawer("settings");
    useNavStore.getState().closeRightDrawer();
    expect(useNavStore.getState().rightDrawer).toBeNull();
    expect(useNavStore.getState().leftDrawer).toBe("characters");
  });
});

/* ------------------------------------------------------------------ */
/*  6. Toggle close: clicking already-open drawer icon closes it       */
/* ------------------------------------------------------------------ */

describe("Drawer navigation smoke — toggle close", () => {
  beforeEach(resetStore);

  it("closeLeftDrawer clears the left drawer", () => {
    useNavStore.getState().openLeftDrawer("characters");
    expect(useNavStore.getState().leftDrawer).toBe("characters");

    useNavStore.getState().closeLeftDrawer();
    expect(useNavStore.getState().leftDrawer).toBeNull();
  });

  it("closeRightDrawer clears the right drawer", () => {
    useNavStore.getState().openRightDrawer("settings");
    expect(useNavStore.getState().rightDrawer).toBe("settings");

    useNavStore.getState().closeRightDrawer();
    expect(useNavStore.getState().rightDrawer).toBeNull();
  });

  it("open → close → open again cycle works for left", () => {
    useNavStore.getState().openLeftDrawer("characters");
    expect(useNavStore.getState().leftDrawer).toBe("characters");

    useNavStore.getState().closeLeftDrawer();
    expect(useNavStore.getState().leftDrawer).toBeNull();

    useNavStore.getState().openLeftDrawer("worldinfo");
    expect(useNavStore.getState().leftDrawer).toBe("worldinfo");
  });

  it("open → close → open again cycle works for right", () => {
    useNavStore.getState().openRightDrawer("settings");
    expect(useNavStore.getState().rightDrawer).toBe("settings");

    useNavStore.getState().closeRightDrawer();
    expect(useNavStore.getState().rightDrawer).toBeNull();

    useNavStore.getState().openRightDrawer("settings");
    expect(useNavStore.getState().rightDrawer).toBe("settings");
  });

  it("double close is idempotent", () => {
    useNavStore.getState().openLeftDrawer("characters");
    useNavStore.getState().closeLeftDrawer();
    useNavStore.getState().closeLeftDrawer(); // second close should be no-op
    expect(useNavStore.getState().leftDrawer).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  7. Center page host — section label mapping (store-level)          */
/* ------------------------------------------------------------------ */

describe("Drawer navigation smoke — center page host sections", () => {
  beforeEach(resetStore);

  it("default section is 'welcome'", () => {
    expect(useNavStore.getState().sectionId).toBe("welcome");
  });

  const sections = [
    "welcome",
    "characters",
    "chats",
    "worldinfo",
    "settings",
    "extensions",
    "connections",
  ] as const;

  for (const section of sections) {
    it(`openSection('${section}') sets sectionId to '${section}'`, () => {
      useNavStore.getState().openSection(section);
      expect(useNavStore.getState().sectionId).toBe(section);
    });
  }

  it("switching sections updates sectionId (not additive)", () => {
    useNavStore.getState().openSection("characters");
    useNavStore.getState().openSection("chats");
    expect(useNavStore.getState().sectionId).toBe("chats");
    // Ensure it's a single value, not accumulating
    expect(typeof useNavStore.getState().sectionId).toBe("string");
  });
});

/* ------------------------------------------------------------------ */
/*  8. All 7 sections reachable — full navigation round-trip           */
/* ------------------------------------------------------------------ */

describe("Drawer navigation smoke — full navigation round-trip", () => {
  beforeEach(resetStore);

  it("can navigate through all sections and return to welcome", () => {
    const store = useNavStore.getState();

    // Start at welcome
    expect(store.sectionId).toBe("welcome");

    // Visit every section
    store.openSection("characters");
    expect(useNavStore.getState().sectionId).toBe("characters");

    store.openLeftDrawer("worldinfo");
    expect(useNavStore.getState().leftDrawer).toBe("worldinfo");

    store.openSection("chats");
    expect(useNavStore.getState().sectionId).toBe("chats");

    store.openLeftDrawer("extensions");
    expect(useNavStore.getState().leftDrawer).toBe("extensions");

    store.openSection("settings");
    expect(useNavStore.getState().sectionId).toBe("settings");

    store.openRightDrawer("settings");
    expect(useNavStore.getState().rightDrawer).toBe("settings");

    store.openSection("connections");
    expect(useNavStore.getState().sectionId).toBe("connections");

    // Return to welcome
    store.openSection("welcome");
    expect(useNavStore.getState().sectionId).toBe("welcome");

    // Close all drawers
    store.closeLeftDrawer();
    store.closeRightDrawer();
    expect(useNavStore.getState().leftDrawer).toBeNull();
    expect(useNavStore.getState().rightDrawer).toBeNull();
  });

  it("left drawer can cycle through all 4 left-section icons", () => {
    const leftSections = ["characters", "worldinfo", "extensions", "connections"] as const;
    for (const section of leftSections) {
      useNavStore.getState().openLeftDrawer(section);
      expect(useNavStore.getState().leftDrawer).toBe(section);
    }
    // Last one should still be connections
    expect(useNavStore.getState().leftDrawer).toBe("connections");
  });
});

/* ------------------------------------------------------------------ */
/*  9. DrawerIcon click simulation (store-level)                       */
/* ------------------------------------------------------------------ */

describe("Drawer navigation smoke — DrawerIcon click behavior", () => {
  beforeEach(resetStore);

  it("center icon (chats) calls openSection", () => {
    // Simulate what DrawerIcon.handleClick does for center slot
    useNavStore.getState().openSection("chats");
    expect(useNavStore.getState().sectionId).toBe("chats");
  });

  it("left icon (characters) when closed calls openLeftDrawer", () => {
    // Simulate DrawerIcon.handleClick for left slot when not open
    const { leftDrawer, openLeftDrawer, closeLeftDrawer } = useNavStore.getState();
    const sectionId = "characters" as const;

    if (leftDrawer === sectionId) {
      closeLeftDrawer();
    } else {
      openLeftDrawer(sectionId);
    }
    expect(useNavStore.getState().leftDrawer).toBe("characters");
  });

  it("left icon (characters) when open calls closeLeftDrawer (toggle)", () => {
    useNavStore.getState().openLeftDrawer("characters");

    const { leftDrawer, openLeftDrawer, closeLeftDrawer } = useNavStore.getState();
    const sectionId = "characters" as const;

    if (leftDrawer === sectionId) {
      closeLeftDrawer();
    } else {
      openLeftDrawer(sectionId);
    }
    expect(useNavStore.getState().leftDrawer).toBeNull();
  });

  it("right icon (settings) when closed calls openRightDrawer", () => {
    const { rightDrawer, openRightDrawer, closeRightDrawer } = useNavStore.getState();
    const sectionId = "settings" as const;

    if (rightDrawer === sectionId) {
      closeRightDrawer();
    } else {
      openRightDrawer(sectionId);
    }
    expect(useNavStore.getState().rightDrawer).toBe("settings");
  });

  it("right icon (settings) when open calls closeRightDrawer (toggle)", () => {
    useNavStore.getState().openRightDrawer("settings");

    const { rightDrawer, openRightDrawer, closeRightDrawer } = useNavStore.getState();
    const sectionId = "settings" as const;

    if (rightDrawer === sectionId) {
      closeRightDrawer();
    } else {
      openRightDrawer(sectionId);
    }
    expect(useNavStore.getState().rightDrawer).toBeNull();
  });
});
