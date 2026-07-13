import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Globe,
  Settings,
  Puzzle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAppStore } from "@/lib/stores";

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Characters", path: "/characters", icon: Users },
  { label: "Chats", path: "/chats", icon: MessageSquare },
  { label: "World Info", path: "/worldinfo", icon: Globe },
  { label: "Settings", path: "/settings", icon: Settings },
  { label: "Extensions", path: "/extensions", icon: Puzzle },
] as const;

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, activeRoute } = useAppStore();

  return (
    <aside
      className={
        "flex flex-col border-r bg-sidebar transition-all duration-200 " +
        (sidebarOpen ? "w-52" : "w-16")
      }
    >
      <div className="flex h-14 items-center justify-between px-3 border-b">
        {sidebarOpen && (
          <span className="text-lg font-bold text-sidebar-foreground">
            SlopForge
          </span>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="ml-auto p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground"
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-0.5 px-2">
          {navItems.map((item) => {
            const isActive = activeRoute === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors " +
                    (isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")
                  }
                  activeOptions={{ exact: item.path === "/" }}
                  onClick={() => useAppStore.getState().setActiveRoute(item.path)}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t p-3">
        {sidebarOpen ? (
          <p className="text-xs text-sidebar-foreground/60">v0.1.0</p>
        ) : (
          <div className="h-2 w-2 rounded-full bg-sidebar-foreground/30 mx-auto" />
        )}
      </div>
    </aside>
  );
}
