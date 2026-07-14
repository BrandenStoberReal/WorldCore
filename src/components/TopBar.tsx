import { Link } from "@tanstack/react-router";
import { PanelLeft } from "lucide-react";
import { useAppStore, useGenerationStore } from "@/lib/stores";
import { cn } from "@/lib/utils";

function LogoMark() {
  return (
    <div
      className="relative flex items-center justify-center h-8 w-8 bg-muted/60 border border-border rounded-[3px]"
      aria-hidden
    >
      <span className="display-host leading-none text-foreground text-[14px]">
        <span className="text-ember">互联</span>
      </span>
    </div>
  );
}

export function TopBar() {
  const { user, theme, setTheme } = useAppStore();
  const toggleGenSidebar = useGenerationStore((s) => s.toggleSidebar);
  const genSidebarOpen = useGenerationStore((s) => s.isOpen);

  const themeNext: "light" | "dark" | "system" = theme === "dark" ? "light" : "dark";

  return (
    <header className="top-bar flex items-center justify-between px-4" role="banner">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleGenSidebar}
          className={cn(
            "hidden md:flex items-center justify-center h-8 w-8 rounded-sm",
            "border border-border bg-background/60 hover:bg-accent/40 transition-colors",
            genSidebarOpen && "border-ember/30 bg-ember/10",
          )}
          aria-label="Toggle generation sidebar"
          title="Generation settings"
        >
          <PanelLeft
            className={cn("h-4 w-4", genSidebarOpen ? "text-ember" : "text-foreground/60")}
            strokeWidth={2}
          />
        </button>

        <div className="flex items-center gap-3">
          <Link
            to="/"
            onClick={() => useAppStore.getState().setActiveRoute("/")}
            className="flex items-center gap-2 group"
            aria-label="WorldCore home"
          >
            <LogoMark />
            <span className="hidden sm:inline display-host text-[17px]">
              World<span className="text-ember">Core</span>
            </span>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTheme(themeNext)}
          className={cn(
            "flex items-center justify-center h-8 px-2.5 rounded-sm",
            "border border-border bg-background/60 hover:bg-accent/40 transition-colors",
          )}
          aria-label={`Switch to ${themeNext} theme`}
          title={`Theme: ${theme}`}
        >
          <ThemeGlyph theme={theme} />
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-border/60">
          <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-muted/60 border border-border">
            <span className="display-host text-[13px] text-foreground/80">
              {user ? user.name[0]?.toUpperCase() ?? "G" : "G"}
            </span>
          </div>
        </div>
      </div>
    </header>
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
