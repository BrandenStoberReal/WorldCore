import { Outlet, useLocation } from "@tanstack/react-router";
import { Sidebar } from "@/components/Sidebar";
import { useAppStore } from "@/lib/stores";
import { User } from "lucide-react";

const FULL_HEIGHT_ROUTES = ["/chats"];

export function Layout() {
  const { user } = useAppStore();
  const { pathname } = useLocation();
  const isFullHeight = FULL_HEIGHT_ROUTES.includes(pathname);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b px-4 bg-background shrink-0">
          <h1 className="text-sm font-medium text-muted-foreground">
            SlopForge
          </h1>
          <div className="flex items-center gap-3">
            {user ? (
              <span className="text-sm font-medium">{user.name}</span>
            ) : (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Guest</span>
              </div>
            )}
          </div>
        </header>
        <main className={`flex-1 overflow-hidden ${isFullHeight ? "" : "overflow-y-auto p-6"}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
