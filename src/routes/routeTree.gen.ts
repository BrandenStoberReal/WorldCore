import { createRootRoute, createRoute } from "@tanstack/react-router";
import { Component as LayoutComponent } from "@/routes/_layout";
import { WelcomePanel as IndexComponent } from "@/panels/WelcomePanel";
import { CharactersPanel as CharactersComponent } from "@/panels/CharactersPanel";
import { ChatsPanel as ChatsComponent } from "@/panels/ChatsPanel";
import { WorldInfoPanel as WorldinfoComponent } from "@/panels/WorldInfoPanel";
import { SettingsPanel as SettingsComponent } from "@/panels/SettingsPanel";
import { ExtensionsPanel as ExtensionsComponent } from "@/panels/ExtensionsPanel";
import { ConnectionsPanel as ConnectionsComponent } from "@/panels/ConnectionsPanel";

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

const connectionsRoute = createRoute({
  getParentRoute: () => rootLayout,
  path: "connections",
  component: ConnectionsComponent,
});

export const routeTree = rootRoute.addChildren([
  rootLayout.addChildren([
    indexRoute,
    charactersRoute,
    chatsRoute,
    worldinfoRoute,
    settingsRoute,
    extensionsRoute,
    connectionsRoute,
  ]),
]);
