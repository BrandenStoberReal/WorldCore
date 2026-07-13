import { createRootRoute, createRoute } from "@tanstack/react-router";
import { Component as LayoutComponent } from "@/routes/_layout";
import { Component as IndexComponent } from "@/routes/index";
import { Component as CharactersComponent } from "@/routes/_layout/characters";
import { Component as ChatsComponent } from "@/routes/_layout/chats";
import { Component as WorldinfoComponent } from "@/routes/_layout/worldinfo";
import { Component as SettingsComponent } from "@/routes/_layout/settings";
import { Component as ExtensionsComponent } from "@/routes/_layout/extensions";

const rootRoute = createRootRoute();

const rootLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: "rootLayout",
  component: LayoutComponent,
});

const indexRoute = createRoute({
  getParentRoute: () => rootLayout,
  path: "/",
  component: IndexComponent,
});

const charactersRoute = createRoute({
  getParentRoute: () => rootLayout,
  path: "characters",
  component: CharactersComponent,
});

const chatsRoute = createRoute({
  getParentRoute: () => rootLayout,
  path: "chats",
  component: ChatsComponent,
});

const worldinfoRoute = createRoute({
  getParentRoute: () => rootLayout,
  path: "worldinfo",
  component: WorldinfoComponent,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootLayout,
  path: "settings",
  component: SettingsComponent,
});

const extensionsRoute = createRoute({
  getParentRoute: () => rootLayout,
  path: "extensions",
  component: ExtensionsComponent,
});

export const routeTree = rootRoute.addChildren([
  rootLayout.addChildren([
    indexRoute,
    charactersRoute,
    chatsRoute,
    worldinfoRoute,
    settingsRoute,
    extensionsRoute,
  ]),
]);
