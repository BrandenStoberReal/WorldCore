import { Outlet, useLocation } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { GenerationSidebar } from "@/components/GenerationSidebar";
import { cn } from "@/lib/utils";

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
  "/connections": {
    number: "06",
    title: "Connections",
    sub: "Connection profiles",
    pathLabel: "~/atelier/connections",
  },
};

export function Layout() {
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

  return (
    <div
      className={cn(
        "flex h-screen w-full overflow-hidden text-foreground relative isolate",
        "bg-background",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 dot-grid opacity-20"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-32 bg-gradient-to-b from-ember/8 to-transparent"
      />

      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />

        <div className="flex flex-1 pt-16 overflow-hidden">
          <GenerationSidebar />

          <main
            className={cn(
              "flex-1 relative min-w-0 transition-[flex-basis] duration-300",
              isFullHeight ? "overflow-hidden" : "overflow-y-auto",
              !isFullHeight && pathname !== "/" && "p-6 md:p-10",
            )}
          >
            <div className="mb-6 md:mb-8 hidden md:block">
              <div className="flex items-baseline gap-3">
                <span className="mono-tag text-ember/80">{meta.number}</span>
                <span className="display-host text-[22px] leading-none truncate">
                  {meta.title}
                </span>
              </div>
              <span className="mono-tag text-muted-foreground/45 mt-1 block">
                {meta.pathLabel}
              </span>
            </div>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
