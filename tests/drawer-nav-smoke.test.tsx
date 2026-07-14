import { describe, it, expect, beforeEach } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useNavStore } from "../src/lib/navStore";
import { DrawerShell } from "../src/components/drawers/DrawerShell";
import { CenterPageHost } from "../src/components/drawers/CenterPageHost";
import { NavRail } from "../src/components/drawers/NavRail";
import { DrawerSlot } from "../src/components/drawers/DrawerSlot";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const testQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

/** Reset the store to its initial state before every test. */
function resetStore() {
  useNavStore.setState({
    sectionId: "welcome",
    topDrawer: null,
    charactersOpen: false,
  });
}

/** Render DrawerShell to static markup and return the HTML string. */
function shellHtml(): string {
  return renderToStaticMarkup(
    <QueryClientProvider client={testQueryClient}>
      <DrawerShell />
    </QueryClientProvider>,
  );
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

  it("no top drawer is open", () => {
    expect(useNavStore.getState().topDrawer).toBeNull();
  });

  it("characters sidebar is closed", () => {
    expect(useNavStore.getState().charactersOpen).toBe(false);
  });

  it("DrawerShell renders data-drawer-shell root element", () => {
    const html = shellHtml();
    expect(html).toContain("data-drawer-shell");
  });

  it("NavRail renders in header element", () => {
    const html = railHtml();
    expect(html).toContain("<header");
    expect(html).toContain("data-topbar");
  });

  it("NavRail renders all 6 section icons with correct data attributes", () => {
    const html = railHtml();
    expect(html).toContain('data-drawer-icon="welcome"');
    expect(html).toContain('data-drawer-icon="characters"');
    expect(html).toContain('data-drawer-icon="worldinfo"');
    expect(html).toContain('data-drawer-icon="extensions"');
    expect(html).toContain('data-drawer-icon="connections"');
    expect(html).toContain('data-drawer-icon="settings"');
  });

  it("DrawerShell has top drawer and characters sidebar slots", () => {
    const html = shellHtml();
    expect(html).toContain('data-drawer-slot="top"');
    expect(html).toContain('data-drawer-slot="characters"');
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
  it("applies drawer-open class when open={true} for top direction", () => {
    const html = renderToStaticMarkup(
      <DrawerSlot direction="top" open={true}>
        <span>content</span>
      </DrawerSlot>,
    );
    expect(html).toContain("drawer-open");
    expect(html).toContain("content");
  });

  it("does not apply drawer-open class when open={false}", () => {
    const html = renderToStaticMarkup(
      <DrawerSlot direction="top" open={false}>
        <span>content</span>
      </DrawerSlot>,
    );
    expect(html).not.toContain("drawer-open");
  });

  it("characters sidebar applies drawer-open class when open={true}", () => {
    const html = renderToStaticMarkup(
      <DrawerSlot direction="characters" open={true}>
        <span>characters-panel</span>
      </DrawerSlot>,
    );
    expect(html).toContain("drawer-open");
    expect(html).toContain("characters-panel");
  });
});

/* ------------------------------------------------------------------ */
/*  3. Clicking Characters icon toggles sidebar (store level)          */
/* ------------------------------------------------------------------ */

describe("Drawer navigation smoke — Characters sidebar toggle", () => {
  beforeEach(resetStore);

  it("toggleCharacters() sets charactersOpen to true", () => {
    useNavStore.getState().toggleCharacters();
    expect(useNavStore.getState().charactersOpen).toBe(true);
  });

  it("sectionId remains 'welcome' when only characters sidebar opens", () => {
    useNavStore.getState().toggleCharacters();
    expect(useNavStore.getState().sectionId).toBe("welcome");
  });

  it("topDrawer is unaffected by opening characters sidebar", () => {
    useNavStore.getState().toggleCharacters();
    expect(useNavStore.getState().topDrawer).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  4. Mutual exclusivity: WorldInfo closes other top drawers          */
/* ------------------------------------------------------------------ */

describe("Drawer navigation smoke — mutual exclusivity for top drawers", () => {
  beforeEach(resetStore);

  it("opening WorldInfo replaces any existing top drawer", () => {
    useNavStore.getState().openTopDrawer("worldinfo");
    expect(useNavStore.getState().topDrawer).toBe("worldinfo");

    useNavStore.getState().openTopDrawer("extensions");
    expect(useNavStore.getState().topDrawer).toBe("extensions");
  });

  it("opening Connections replaces Extensions", () => {
    useNavStore.getState().openTopDrawer("extensions");
    useNavStore.getState().openTopDrawer("connections");
    expect(useNavStore.getState().topDrawer).toBe("connections");
  });

  it("opening Settings replaces Connections", () => {
    useNavStore.getState().openTopDrawer("connections");
    useNavStore.getState().openTopDrawer("settings");
    expect(useNavStore.getState().topDrawer).toBe("settings");
  });

  it("only one top drawer can be open at a time (rapid succession)", () => {
    useNavStore.getState().openTopDrawer("worldinfo");
    useNavStore.getState().openTopDrawer("extensions");
    useNavStore.getState().openTopDrawer("connections");
    useNavStore.getState().openTopDrawer("settings");
    expect(useNavStore.getState().topDrawer).toBe("settings");
    // Verify only one value (not an array or merged state)
    expect(typeof useNavStore.getState().topDrawer).toBe("string");
  });
});

/* ------------------------------------------------------------------ */
/*  5. Settings opens top drawer (not right drawer anymore)            */
/* ------------------------------------------------------------------ */

describe("Drawer navigation smoke — Settings top drawer", () => {
  beforeEach(resetStore);

  it("openTopDrawer('settings') sets topDrawer to 'settings'", () => {
    useNavStore.getState().openTopDrawer("settings");
    expect(useNavStore.getState().topDrawer).toBe("settings");
  });

  it("top drawer and characters sidebar are independent", () => {
    useNavStore.getState().toggleCharacters();
    useNavStore.getState().openTopDrawer("settings");
    expect(useNavStore.getState().charactersOpen).toBe(true);
    expect(useNavStore.getState().topDrawer).toBe("settings");
  });

  it("closing top drawer does not affect characters sidebar", () => {
    useNavStore.getState().toggleCharacters();
    useNavStore.getState().openTopDrawer("settings");
    useNavStore.getState().closeTopDrawer();
    expect(useNavStore.getState().topDrawer).toBeNull();
    expect(useNavStore.getState().charactersOpen).toBe(true);
  });

  it("closing characters sidebar does not affect top drawer", () => {
    useNavStore.getState().toggleCharacters();
    useNavStore.getState().openTopDrawer("settings");
    useNavStore.getState().toggleCharacters();
    expect(useNavStore.getState().charactersOpen).toBe(false);
    expect(useNavStore.getState().topDrawer).toBe("settings");
  });
});

/* ------------------------------------------------------------------ */
/*  6. Toggle close: clicking already-open drawer icon closes it       */
/* ------------------------------------------------------------------ */

describe("Drawer navigation smoke — toggle close", () => {
  beforeEach(resetStore);

  it("closeTopDrawer clears the top drawer", () => {
    useNavStore.getState().openTopDrawer("worldinfo");
    expect(useNavStore.getState().topDrawer).toBe("worldinfo");

    useNavStore.getState().closeTopDrawer();
    expect(useNavStore.getState().topDrawer).toBeNull();
  });

  it("toggleCharacters twice clears the characters sidebar", () => {
    useNavStore.getState().toggleCharacters();
    expect(useNavStore.getState().charactersOpen).toBe(true);

    useNavStore.getState().toggleCharacters();
    expect(useNavStore.getState().charactersOpen).toBe(false);
  });

  it("open → close → open again cycle works for top drawer", () => {
    useNavStore.getState().openTopDrawer("worldinfo");
    expect(useNavStore.getState().topDrawer).toBe("worldinfo");

    useNavStore.getState().closeTopDrawer();
    expect(useNavStore.getState().topDrawer).toBeNull();

    useNavStore.getState().openTopDrawer("extensions");
    expect(useNavStore.getState().topDrawer).toBe("extensions");
  });

  it("open → close → open again cycle works for characters sidebar", () => {
    useNavStore.getState().toggleCharacters();
    expect(useNavStore.getState().charactersOpen).toBe(true);

    useNavStore.getState().toggleCharacters();
    expect(useNavStore.getState().charactersOpen).toBe(false);

    useNavStore.getState().toggleCharacters();
    expect(useNavStore.getState().charactersOpen).toBe(true);
  });

  it("double close is idempotent", () => {
    useNavStore.getState().openTopDrawer("worldinfo");
    useNavStore.getState().closeTopDrawer();
    useNavStore.getState().closeTopDrawer(); // second close should be no-op
    expect(useNavStore.getState().topDrawer).toBeNull();
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
/*  8. All sections reachable — full navigation round-trip             */
/* ------------------------------------------------------------------ */

describe("Drawer navigation smoke — full navigation round-trip", () => {
  beforeEach(resetStore);

  it("can navigate through all sections and return to welcome", () => {
    const store = useNavStore.getState();

    // Start at welcome
    expect(store.sectionId).toBe("welcome");

    // Visit center sections
    store.openSection("characters");
    expect(useNavStore.getState().sectionId).toBe("characters");

    store.openSection("chats");
    expect(useNavStore.getState().sectionId).toBe("chats");

    // Open top drawers
    store.openTopDrawer("worldinfo");
    expect(useNavStore.getState().topDrawer).toBe("worldinfo");

    store.openTopDrawer("extensions");
    expect(useNavStore.getState().topDrawer).toBe("extensions");

    store.openTopDrawer("connections");
    expect(useNavStore.getState().topDrawer).toBe("connections");

    store.openTopDrawer("settings");
    expect(useNavStore.getState().topDrawer).toBe("settings");

    // Toggle characters sidebar
    store.toggleCharacters();
    expect(useNavStore.getState().charactersOpen).toBe(true);

    // Return to welcome
    store.openSection("welcome");
    expect(useNavStore.getState().sectionId).toBe("welcome");

    // Close all
    store.closeTopDrawer();
    store.toggleCharacters();
    expect(useNavStore.getState().topDrawer).toBeNull();
    expect(useNavStore.getState().charactersOpen).toBe(false);
  });

  it("top drawer can cycle through all 4 top-section icons", () => {
    const topSections = ["worldinfo", "extensions", "connections", "settings"] as const;
    for (const section of topSections) {
      useNavStore.getState().openTopDrawer(section);
      expect(useNavStore.getState().topDrawer).toBe(section);
    }
    // Last one should still be settings
    expect(useNavStore.getState().topDrawer).toBe("settings");
  });
});

/* ------------------------------------------------------------------ */
/*  9. DrawerIcon click simulation (store-level)                       */
/* ------------------------------------------------------------------ */

describe("Drawer navigation smoke — DrawerIcon click behavior", () => {
  beforeEach(resetStore);

  it("center icon (chats) calls openSection", () => {
    useNavStore.getState().openSection("chats");
    expect(useNavStore.getState().sectionId).toBe("chats");
  });

  it("characters icon toggles sidebar open", () => {
    useNavStore.getState().toggleCharacters();
    expect(useNavStore.getState().charactersOpen).toBe(true);
  });

  it("characters icon toggles sidebar closed when already open", () => {
    useNavStore.getState().toggleCharacters();
    useNavStore.getState().toggleCharacters();
    expect(useNavStore.getState().charactersOpen).toBe(false);
  });

  it("top drawer icon (worldinfo) opens top drawer", () => {
    useNavStore.getState().openTopDrawer("worldinfo");
    expect(useNavStore.getState().topDrawer).toBe("worldinfo");
  });

  it("top drawer icon (worldinfo) closes top drawer when same drawer open", () => {
    useNavStore.getState().openTopDrawer("worldinfo");
    // Simulate toggle behavior
    const { topDrawer, closeTopDrawer, openTopDrawer } = useNavStore.getState();
    if (topDrawer === "worldinfo") {
      closeTopDrawer();
    } else {
      openTopDrawer("worldinfo");
    }
    expect(useNavStore.getState().topDrawer).toBeNull();
  });
});
