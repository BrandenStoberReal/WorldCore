import { Outlet, useLocation } from "@tanstack/react-router";
import { Sidebar } from "@/components/Sidebar";
import { useAppStore } from "@/lib/stores";
import { cn, frostedGlass } from "@/lib/utils";

const FULL_HEIGHT_ROUTES = ["/chats"];

const ROUTE_META: Record<
  string,
  { number: string; title: string; sub: string; pathLabel: string }
> = {
  "/": {
    number: "00",
    title: "Atelier",
    sub: "Workspace overview",
    pathLabel: "~/atelier",
  },
  "/characters": {
    number: "01",
    title: "Characters",
    sub: "Manage characters & lore",
    pathLabel: "~/atelier/characters",
  },
  "/chats": {
    number: "02",
    title: "Chat",
    sub: "Active chats",
    pathLabel: "~/atelier/chats",
  },
  "/worldinfo": {
    number: "03",
    title: "World Info",
    sub: "Lore tablets & vector triggers",
    pathLabel: "~/atelier/worldinfo",
  },
  "/settings": {
    number: "04",
    title: "Settings",
    sub: "Generation parameters",
    pathLabel: "~/atelier/settings",
  },
  "/extensions": {
    number: "05",
    title: "Extensions",
    sub: "Modules & plugins",
    pathLabel: "~/atelier/extensions",
  },
};

export function Layout() {
  const { user, theme, setTheme } = useAppStore();
  const { pathname } = useLocation();
  const isFullHeight = FULL_HEIGHT_ROUTES.some((r) =>
    r === "/chats" ? pathname.startsWith("/chats") : pathname === r,
  );

  const fallback: { number: string; title: string; sub: string; pathLabel: string } =
    { number: "00", title: "Atelier", sub: "Workspace overview", pathLabel: "~/atelier" };
  const meta: { number: string; title: string; sub: string; pathLabel: string } =
    (ROUTE_META[pathname] ??
    (Object.entries(ROUTE_META).find(([route]) =>
      pathname.startsWith(route) && route !== "/",
    )?.[1] ??
    fallback));

  const themeNext: "light" | "dark" | "system" =
    theme === "dark" ? "light" : "dark";

  return (
    <div
      className={cn(
        "flex h-screen w-full overflow-hidden text-foreground relative isolate",
        "bg-background",
      )}
    >
      {/* Subtle crosshair grid behind everything */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 dot-grid opacity-20"
      />
      {/* Top ember ambient */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-32 bg-gradient-to-b from-ember/8 to-transparent"
      />

      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Header — frosted glass + breadcrumb + status + theme */}
        <header
          className={cn(
            frostedGlass,
            "flex h-16 items-center justify-between px-6 shrink-0 z-20 relative",
          )}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-baseline gap-3 min-w-0">
              <span className="mono-tag text-ember/80">{meta.number}</span>
              <span
                className="display-host text-[22px] leading-none truncate"
              >
                {meta.title}
              </span>
            </div>
            <span className="hidden md:block h-4 w-px bg-border" />
            <span className="hidden md:block mono-tag text-muted-foreground/65 truncate">
              {meta.pathLabel}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-muted-foreground/65">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-ember opacity-50 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ember" />
              </span>
              <span className="mono-tag">System Ready</span>
            </div>

            <button
              type="button"
              onClick={() => setTheme(themeNext)}
              className={cn(
                "group flex items-center justify-center h-8 px-2.5 rounded-sm",
                "border border-border bg-background/60 hover:bg-accent/40 transition-colors",
              )}
              aria-label={`Switch to ${themeNext} theme`}
              title={`Theme: ${theme}`}
            >
              <ThemeGlyph theme={theme} />
            </button>

            <div className="flex items-center gap-2 pl-4 border-l border-border">
              <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-muted/60 border border-border">
                <span className="display-host text-[14px] text-foreground/80">
                  {user ? user.name[0]?.toUpperCase() ?? "G" : "G"}
                </span>
              </div>
              <div className="hidden md:flex flex-col leading-none">
                <span className="text-xs font-medium">
                  {user ? user.name : "Guest"}
                </span>
                <span className="mono-tag text-muted-foreground/60 mt-0.5">
                  {user ? user.role : "anonymous"}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main
          className={cn(
            "flex-1 relative overflow",
            isFullHeight ? "overflow-hidden" : "overflow-y-auto",
            !isFullHeight && "p-8 md:p-10",
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function ThemeGlyph({ theme }: { theme: "light" | "dark" | "system" }) {
  const isDark = theme === "dark" || theme === "system";
  return (
    <span className="relative inline-flex h-3.5 w-3.5 items-center justify-center">
      <span
        className={cn(
          "absolute inset-0 rounded-full transition-opacity",
          isDark ? "opacity-0" : "opacity-100 bg-ember",
        )}
      />
      <span
        className={cn(
          "absolute inset-0 transition-opacity rounded-full bg-foreground",
          isDark ? "opacity-80" : "opacity-15",
        )}
      />
      <span
        className={cn(
          "absolute h-2 w-2 rounded-full bg-background transition-all",
          isDark ? "translate-x-1.5 -translate-y-0" : "translate-x-[-2px]",
        )}
        style={{ boxShadow: "0 0 0 1px var(--border)" }}
      />
    </span>
  );
}
