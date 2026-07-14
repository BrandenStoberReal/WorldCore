import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Globe,
  Settings,
  Puzzle,
  Cable,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useAppStore } from "@/lib/stores";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  number: string;
  path: string;
  pathLabel: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const navItems: NavItem[] = [
  { label: "Atelier",      number: "00", path: "/",            pathLabel: "root",      icon: LayoutDashboard },
  { label: "Characters",  number: "01", path: "/characters",  pathLabel: "characters",icon: Users },
  { label: "Chat",         number: "02", path: "/chats",       pathLabel: "chats",     icon: MessageSquare },
  { label: "World Info",   number: "03", path: "/worldinfo",   pathLabel: "worldinfo", icon: Globe },
  { label: "Settings",     number: "04", path: "/settings",   pathLabel: "settings",  icon: Settings },
  { label: "Extensions",   number: "05", path: "/extensions", pathLabel: "extensions",icon: Puzzle },
  { label: "Connections",  number: "06", path: "/connections", pathLabel: "connections",icon: Cable },
];

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, activeRoute } = useAppStore();
  const router = useRouterState();
  const currentPath = router.location.pathname;

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-300 ease-out",
        "relative isolate",
        sidebarOpen ? "w-60" : "w-[72px]",
      )}
    >
      {/* Logo band */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border shrink-0",
          sidebarOpen ? "justify-between pl-5 pr-3" : "justify-center px-2",
        )}
      >
        <Link
          to="/"
          onClick={() => useAppStore.getState().setActiveRoute("/")}
          className="flex items-center gap-2.5 group/logo-mark min-w-0"
          aria-label="WorldCore home"
        >
          <LogoMark collapsed={!sidebarOpen} />
          {sidebarOpen && (
            <div className="flex flex-col leading-none min-w-0">
              <span
                className="display-host text-[19px] truncate"
              >
                World<span className="text-ember">Core</span>
              </span>
              <span className="mono-tag text-sidebar-foreground/45 mt-0.5">
                v0.1.0 — build 1a3f
              </span>
            </div>
          )}
        </Link>
        {sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors shrink-0"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Primary navigation */}
      <nav className="flex-1 overflow-y-auto py-5">
        <div className={cn("px-3 mb-3", !sidebarOpen && "px-2")}>
          <span
            className={cn(
              "mono-tag text-sidebar-foreground/40 block",
              !sidebarOpen && "sr-only",
            )}
          >
            Workbench
          </span>
          {sidebarOpen && <div className="mt-2 h-px bg-sidebar-border/60" />}
        </div>

        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive =
              activeRoute === item.path ||
              (item.path === "/" ? currentPath === "/" : currentPath.startsWith(item.path));
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => useAppStore.getState().setActiveRoute(item.path)}
                  className={cn(
                    "group relative block rounded-sm transition-all duration-200",
                    "border-l-2",
                    isActive
                      ? "border-ember bg-sidebar-accent/80 text-sidebar-foreground pl-3 pr-3 py-2.5 ember-pulse"
                      : "border-transparent hover:border-ember/40 hover:bg-sidebar-accent/40 text-sidebar-foreground/80 hover:text-sidebar-foreground pl-5 pr-3 py-2.5",
                    !sidebarOpen && "pl-2 pr-2 justify-center",
                  )}
                  activeOptions={{ exact: item.path === "/" }}
                  title={item.label}
                >
                  <div
                    className={cn(
                      "flex items-center gap-3",
                      !sidebarOpen && "justify-center",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive ? "text-ember" : "text-sidebar-foreground/55 group-hover:text-ember",
                      )}
                      strokeWidth={2}
                    />
                    {sidebarOpen && (
                      <div className="flex items-baseline gap-2 min-w-0 flex-1">
                        <span
                          className={cn(
                            "mono-tag shrink-0",
                            isActive ? "text-ember" : "text-sidebar-foreground/35",
                          )}
                        >
                          {item.number}
                        </span>
                        <span
                          className={cn(
                            "text-[13px] truncate font-medium leading-tight",
                            isActive && "font-semibold",
                          )}
                        >
                          {item.label}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Collapsed tooltip rail */}
                  {!sidebarOpen && (
                    <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-sm bg-sidebar-accent border border-sidebar-border px-2 py-1 text-xs opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all">
                      <span className="mono-tag text-ember mr-1.5">{item.number}</span>
                      {item.label}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Divider */}
        <div className={cn("mt-7 mb-5 px-5", !sidebarOpen && "px-3")}>
          <div className="relative h-px bg-sidebar-border" />
        </div>

        {/* Status pip */}
        <div className={cn("px-3", !sidebarOpen && "px-2")}>
          {sidebarOpen ? (
            <div className="rounded-sm border border-sidebar-border bg-sidebar-accent/40 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-ember opacity-60 animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ember" />
                </span>
                <span className="mono-tag text-sidebar-foreground/75">System Ready</span>
              </div>
              <p className="mt-1.5 text-[11px] leading-tight text-sidebar-foreground/45">
                Templates loading · 0 BPM
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-ember opacity-60 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ember" />
              </span>
            </div>
          )}
        </div>
      </nav>

      {/* Footer / collapse toggle */}
      <div className="border-t border-sidebar-border shrink-0">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-full flex items-center justify-center h-12 text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-colors"
            aria-label="Expand sidebar"
          >
            <PanelLeft className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
        {sidebarOpen && (
          <div className="px-5 py-3 flex items-center justify-between">
            <span className="mono-tag text-sidebar-foreground/40">
              <span className="text-ember/70 mr-1.5">●</span>
              Built with ♥
            </span>
            <span className="mono-tag text-sidebar-foreground/25">{`{ ssx }`}</span>
          </div>
        )}
      </div>
    </aside>
  );
}

/** Logo mark — a square mono-mark with accent color. */
function LogoMark({ collapsed }: { collapsed?: boolean }) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center bg-sidebar-accent/60 border border-sidebar-border rounded-[3px]",
        collapsed ? "h-9 w-9" : "h-9 w-9",
      )}
      aria-hidden
    >
      <div
        className="display-host leading-none text-sidebar-foreground text-[15px]"
      >
        <span className="text-ember">⌑</span>
      </div>
    </div>
  );
}
