# WorldCore Extension API

Extensions add functionality to WorldCore by injecting JavaScript modules and CSS
stylesheets into the host application. Extensions register UI components (panels,
slots), slash commands, and listen to lifecycle events through a scoped API object
exposed on `globalThis.WorldCore`.

**Runtime:** ES module scripts served as assets from the extension's on-disk
directory. No build step — extensions ship raw `.js`/`.ts`/`.tsx`.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Extension Structure](#extension-structure)
- [Manifest Schema](#manifest-schema)
- [Installation & Storage](#installation--storage)
- [Lifecycle](#lifecycle)
- [The WorldCore API](#the-worldcore-api)
  - [meta](#meta)
  - [react](#react)
  - [stores](#stores)
  - [queryClient](#queryclient)
  - [apiGet / apiPost / apiFetch](#apiget--apipost--apifetch)
  - [toast](#toast)
  - [settings](#settings)
  - [events](#events)
  - [components](#components)
  - [ui](#ui)
  - [logger](#logger)
  - [registerPanel / unregisterPanel](#registerpanel--unregisterpanel)
  - [registerSlot / unregisterSlot](#registerslot--unregisterslot)
  - [registerSlashCommand / unregisterSlashCommand](#registerslashcommand--unregisterslashcommand)
  - [registerSettingsPanel / unregisterSettingsPanel](#registersettingspanel--unregistersettingspanel)
  - [registerStylesheet](#registerstylesheet)
  - [helpers](#helpers)
- [Event Types](#event-types)
- [Slot IDs](#slot-ids)
- [Server API](#server-api)
- [Reference: hello-world Extension](#reference-hello-world-extension)
- [Common Pitfalls](#common-pitfalls)

---

## Quick Start

Create a directory under `data/extensions/<ext-id>/` (global) or
`data/<userId>/extensions/<ext-id>/` (user-scoped) with three files:

```
data/extensions/my-ext/
  manifest.json
  index.js
  styles.css      (optional)
```

**manifest.json:**

```json
{
  "id": "my-ext",
  "displayName": "My Extension",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "What this extension does.",
  "js": "index.js",
  "css": "styles.css",
  "loadingOrder": 100
}
```

**index.js:**

```js
// Capture the API at init time — this reference stays valid for the
// lifetime of the page.  Do NOT re-read globalThis.WorldCore in effects
// or async callbacks (it may have been overwritten by a later extension).
const api = globalThis.WorldCore;

console.log('Extension loaded:', api.meta.extId);

// Register a slash command
api.registerSlashCommand(
  'greet',
  (args) => api.toast.success(`Hello, ${args || 'world'}!`),
  'Prints a greeting',
);

// Signal activation — must be the last call in your top-level script.
globalThis.__WorldCore_activate__('my-ext');
```

Reload the browser. The extension appears in the Extensions panel and the
`/greet` slash command is available in chat.

---

## Extension Structure

```
<ext-dir>/
  manifest.json       Required. Metadata + entry points.
  index.js            Main script (or .ts/.tsx). ES module.
  styles.css          Optional stylesheet.
  ...                 Any other assets referenced by your code.
```

Assets are served at:

```
/api/v1/extensions/assets/<ext-id>/<relPath>
```

The asset endpoint resolves the directory based on scope (user-local wins over
global when IDs collide).

---

## Manifest Schema

Validated by `ManifestSchema` (`src/shared/schemas/extensions.ts`).

| Field              | Type       | Required | Default       | Notes                                                                                |
| ------------------ | ---------- | -------- | ------------- | ------------------------------------------------------------------------------------ |
| `id`               | `string`   | Yes      | —             | Lowercase alphanumeric + hyphens only (`/^[a-z0-9-]+$/`). Must match directory name. |
| `displayName`      | `string`   | Yes      | —             | Human-readable name shown in the Extensions panel.                                   |
| `version`          | `string`   | Yes      | —             | Semver-style version string.                                                         |
| `author`           | `string`   | Yes      | —             | Extension author name.                                                               |
| `description`      | `string`   | No       | `""`          | Short description.                                                                   |
| `js`               | `string`   | No       | `"index.tsx"` | Entry point script path (relative to ext dir).                                       |
| `css`              | `string`   | No       | —             | Stylesheet path (relative to ext dir).                                               |
| `loadingOrder`     | `number`   | No       | `100`         | Lower = loaded first. Extensions load sequentially by this value.                    |
| `apiVersion`       | `string`   | No       | —             | API version constraint (reserved for future use).                                    |
| `homepage`         | `string`   | No       | —             | URL to extension homepage.                                                           |
| `dependencies`     | `string[]` | No       | `[]`          | Other extension IDs this depends on (reserved).                                      |
| `peerDependencies` | `string[]` | No       | `[]`          | Must be empty — peer dependencies are unsupported in v1.                             |

---

## Installation & Storage

### Directory Layout

| Scope    | Path                                 | Notes                                  |
| -------- | ------------------------------------ | -------------------------------------- |
| `global` | `data/extensions/<ext-id>/`          | Shared across all users. Preinstalled. |
| `user`   | `data/<userId>/extensions/<ext-id>/` | Per-user private extensions.           |

### Preinstalled Global Extensions

Place an extension directory under `data/extensions/`. On server startup,
`seedPreinstalledGlobalExtensions()` reads every subdirectory, validates its
manifest, and upserts a DB row (scope `global`, userId `default-user`). If a
user has a user-scoped extension with the same ID, the user's version shadows
the global one at listing time.

### Installing from Git

POST to `/api/v1/extensions/install` with:

```json
{
  "url": "https://github.com/user/ext-repo",
  "branch": "main", // optional, defaults to main
  "scope": "user" // or "global" (requires admin)
}
```

The server clones the repo to a temp directory, validates the manifest, moves
it to the target directory, and inserts a DB row. The extension is enabled by
default.

### Manifest Validation

On install and update, the manifest is parsed through `ManifestSchema`. Invalid
manifests are rejected with a `ValidationError`. The `id` field must match the
directory name (slug).

---

## Lifecycle

### Loading Sequence

1. **Boot:** `App` mounts → `useExtensionBootloader` fires once.
2. **Fetch list:** GET `/api/v1/extensions/list` returns enabled + disabled rows.
3. **Unload removed:** Extensions no longer in the list have their `<script>`
   and `<link>` nodes removed from the DOM, and their registry entries cleared.
4. **Activate SDK:** `installActivationSdk()` defines
   `globalThis.__WorldCore_activate__` (non-writable, non-configurable).
5. **Load enabled extensions** sequentially, sorted by `loadingOrder`:
   - CSS `<link>` injected into `<head>`.
   - A `WorldCoreAPI` object is created via `createWorldCoreApi()`.
   - `globalThis.WorldCore` is set to the API.
   - A `<script type="module">` is injected pointing to the extension's JS asset.
   - The loader waits for the script to call `globalThis.__WorldCore_activate__(extId)`.
   - On success, emits `ext_installed` on the event bus.
   - On timeout (5s) or error, logs a warning and continues.
   - `globalThis.WorldCore` **persists** for the lifetime of the page.
6. **Render:** React mounts `DrawerShell`, which renders `ExtensionSlot` and
   `ExtensionPanelSlot` components that read registered panels/slots.

### Activation Signal

Every extension **must** call `globalThis.__WorldCore_activate__('<ext-id>')` at
the end of its top-level script. This resolves the activation promise and allows
the loader to proceed to the next extension.

If the script does not call the activation signal within 5 seconds, the extension
is marked as `timeout` and loading continues.

### Unloading

When an extension is toggled off or removed:

1. Its `<script>` and `<link>` DOM nodes are removed.
2. Its registered panels, slots, and slash commands are cleared from the
   in-memory registry.
3. The `ext_uninstalled` event is emitted.

Note: unloading does **not** revert any DOM mutations the extension made beyond
its registered components. Extension code should clean up after itself via React
cleanup effects.

### Hot Reload (dev)

Running `bun dev` uses `bun --hot` which restarts the server on file changes.
The frontend bootloader re-runs on page refresh, picking up any new/removed
extensions.

---

## The WorldCore API

The API object (`WorldCoreAPI`) is available as `globalThis.WorldCore` during and
after extension loading. It is also passed to some registration callbacks.

**Critical:** Cache the API reference at init time:

```js
const api = globalThis.WorldCore;
// Use `api` everywhere, not `globalThis.WorldCore`
```

### meta

```ts
meta: {
  extId: string;
  version: string;
  scope: 'user' | 'global';
}
```

Read-only metadata about the current extension.

### react

```ts
react: typeof import('react');
```

The host application's React instance. Use this to create components, hooks, and
elements. **Do not bundle your own React** — use the host's copy to avoid
conflicts.

```js
const { useState, useEffect, createElement } = globalThis.WorldCore.react;
```

### stores

```ts
stores: {
  app: {
    (getState(), subscribe(cb));
  }
  generation: {
    (getState(), subscribe(cb));
  }
  chat: {
    (getState(), subscribe(cb));
  }
}
```

Direct access to the host's Zustand stores. Subscribe to state changes for
reactive extension behavior.

```js
const { chat } = globalThis.WorldCore.stores;
const unsub = chat.subscribe((state) => {
  console.log('Active character:', state.activeCharacterId);
});
// Call unsub() to stop listening
```

### queryClient

```ts
queryClient: QueryClient;
```

The host's TanStack Query client. Use it to invalidate queries after mutations
or prefetch data.

```js
globalThis.WorldCore.queryClient.invalidateQueries({
  queryKey: ['/api/v1/characters/all'],
});
```

### apiGet / apiPost / apiFetch

```ts
apiGet<T>(path: string): Promise<T>
apiPost<T>(path: string, body?: unknown): Promise<T>
apiFetch(path: string, options?: RequestInit): Promise<unknown>
```

Scoped HTTP helpers. All paths are relative (no leading `/api/v1` prefix — the
prefix is applied automatically). Absolute URLs are blocked.

```js
const characters = await globalThis.WorldCore.apiPost('/characters/all', {
  shallow: true,
});
```

### toast

```ts
toast: {
  success(message: string): void
  error(message: string): void
  info(message: string): void
}
```

Display toast notifications.

### settings

```ts
settings: {
  get<T>(key: string): T | undefined
  set(key: string, value: unknown): Promise<void>
}
```

Per-extension key/value settings, persisted in the database. Keys must match
`/^[a-zA-Z0-9._-]+$/` and cannot be `__proto__`, `constructor`, or `prototype`.
Writes are debounced (500ms) and fire a `settings_changed` event.

```js
await globalThis.WorldCore.settings.set('theme', 'dark');
const theme = globalThis.WorldCore.settings.get < string > 'theme';
```

### events

```ts
events: {
  on(type, handler): () => void     // Subscribe, returns unsubscribe fn
  off(type, handler): void          // Unsubscribe
  emit(type, payload?): void        // Emit to all listeners
  types: Record<EventType, EventType>
}
```

The extension event bus. See [Event Types](#event-types) for available events.

```js
const unsub = api.events.on('character_changed', (payload) => {
  console.log('Character switched:', payload);
});
// Later: unsub()
```

**Important:** `on()` returns an unsubscribe function. Call it in your React
cleanup effects to prevent leaks.

### components

```ts
components: {
  Button, Card, CardContent, CardDescription, CardFooter,
  CardHeader, CardTitle, CardAction,
  Alert, Input, Label, Textarea,
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectScrollDownButton, SelectScrollUpButton, SelectSeparator,
  SelectTrigger, SelectValue,
  LoadingSpinner, EmptyState, PageHeader, PanelHeader,
  SectionLabel, Divider, IconButton,
  Modal, ConfirmDialog,
  buttonVariants,
}
```

The host's shadcn/ui component library. Use these to build UI that matches the
host's design system.

```js
const { createElement } = globalThis.WorldCore.react;
const { Button } = globalThis.WorldCore.components;

function MyWidget() {
  return createElement(Button, { size: 'sm', onClick: () => {} }, 'Click me');
}
```

### ui

```ts
ui: {
  cn: (...args: ClassValue[]) => string; // clsx + tailwind-merge
  tokens: {
    ambientGlow: string;
    frostedGlass: string;
    surfaceCard: string;
    subtleEdge: string;
    elevatedCard: string;
    springTransition: string;
  }
  icons: typeof import('lucide-react'); // Full lucide icon set
}
```

Utility functions and design tokens.

```js
const { cn, tokens, icons } = globalThis.WorldCore.ui;
const className = cn(tokens.surfaceCard, 'my-custom-class');
const icon = createElement(icons.Star, { size: 16 });
```

### logger

```ts
logger: {
  namespace(ns: string): {
    log(...args: unknown[]): void
    warn(...args: unknown[]): void
    error(...args: unknown[]): void
  }
}
```

Namespaced console logging. Prefixes output with `[worldcore-ext:<extId>:<ns>]`.

```js
const log = globalThis.WorldCore.logger.namespace('my-feature');
log.log('initialized');
log.warn('something looks off');
log.error('operation failed', err);
```

### registerPanel / unregisterPanel

```ts
registerPanel(opts: {
  id: string                    // Unique panel ID
  target: 'top-drawer' | 'center'
  component: React.FC           // React component to render
  navIcon?: React.ReactNode     // Icon for nav rail (top-drawer only)
  navLabel?: string             // Tooltip label
  loadingOrder?: number         // Sort order (lower = first)
}): void

unregisterPanel(id: string): void
```

Register a full-page panel accessible from the navigation. The `component` is
rendered inside a `DrawerShell` when the panel is active.

### registerSlot / unregisterSlot

```ts
registerSlot(slotId: WorldCoreSlotId, component: React.FC): void
unregisterSlot(slotId: WorldCoreSlotId, component: React.FC): void
```

Register a component into a named slot. The component is rendered inline at the
slot's location. Multiple extensions can register to the same slot.

See [Slot IDs](#slot-ids) for available slots.

### registerSlashCommand / unregisterSlashCommand

```ts
registerSlashCommand(
  name: string,
  handler: (args: string) => void,
  description?: string,
): void

unregisterSlashCommand(name: string): void
```

Register a `/name` command available in the chat input. When the user types
`/name args`, the handler receives the arguments string.

### registerSettingsPanel / unregisterSettingsPanel

```ts
registerSettingsPanel(component: React.FC): void
unregisterSettingsPanel(): void
```

Register a settings UI component shown in the Extensions panel when the
extension is selected. Only one settings panel per extension.

### registerStylesheet

```ts
registerStylesheet(href: string): void
```

Dynamically inject a `<link rel="stylesheet">` tag. Deduplicates by `href`.
The link is tagged with `data-worldcore-ext="<extId>"`.

### helpers

High-level convenience functions. Wraps the raw API/store accessors so
extensions don't have to know endpoint paths or store shapes.

```ts
helpers: {
  characters: {
    list(): Promise<ShallowCharacter[]>;          // GET /characters/all
    get(id: number): Promise<Character>;           // POST /characters/get { id }
    getActive(): number | null;                    // current character id from chat store
    setActive(id: number | null): void;            // switch active character
  };
  chat: {
    getActiveId(): string | null;                  // current chat file id
    setActiveId(id: string | null): void;          // switch active chat
    getMessages(): ChatMessage[];                  // messages in current chat
  };
  navigation: {
    openSection(id: SectionId): void;              // navigate to a panel
    openTopDrawer(id: TopDrawerId): void;          // open a top overlay drawer
    closeTopDrawer(): void;                        // close the top drawer
  };
  user: {
    get(): { id: string; name: string; role: string } | null;
  };
}
```

**Example:**

```js
const api = globalThis.WorldCore;

// List all characters
const chars = await api.helpers.characters.list();

// Navigate to the chat panel
api.helpers.navigation.openSection('chats');

// Check who's logged in
const me = api.helpers.user.get();
if (me) api.toast.info(`Logged in as ${me.name}`);
```

---

## Event Types

| Event                | Payload                                   | When                                       |
| -------------------- | ----------------------------------------- | ------------------------------------------ |
| `ext_installed`      | `{ id: string }`                          | After an extension successfully activates. |
| `ext_uninstalled`    | `{ id: string }`                          | After an extension is unloaded.            |
| `ext_enabled`        | `{ id: string }`                          | An extension was enabled.                  |
| `ext_disabled`       | `{ id: string }`                          | An extension was disabled.                 |
| `chat_changed`       | `{ chatId: string \| null }`              | Active chat session changed.               |
| `character_changed`  | `{ characterId: number \| null }`         | Active character switched.                 |
| `settings_changed`   | `{ extId, key }`                          | An extension setting was persisted.        |
| `generation_started` | `{ characterId: number }`                 | LLM text generation began.                 |
| `generation_stopped` | `{ characterId: number }`                 | LLM text generation finished.              |
| `message_updated`    | `{ index: number, message: ChatMessage }` | An existing chat message was edited.       |
| `new_message`        | `ChatMessage` (full object)               | A new chat message was appended.           |
| `user_initialized`   | `{ userId: string }`                      | User session loaded on app start.          |
| `viewport_changed`   | `{ sectionId: SectionId }`                | Active panel changed.                      |
| `top_drawer_changed` | `{ drawerId: TopDrawerId \| null }`       | Top overlay drawer opened or closed.       |
| `character_import`   | `{ id: number }`                          | A character was imported.                  |

---

## Slot IDs

| Slot ID                    | Location                     | Description                             |
| -------------------------- | ---------------------------- | --------------------------------------- |
| `chat-input-toolbar`       | Below the chat text input    | Buttons/tools alongside the send area.  |
| `message-actions`          | Per-message action bar       | Buttons on individual messages (hover). |
| `character-editor-sidebar` | Character editor sidebar     | Extra controls in the character form.   |
| `generation-panel-bottom`  | Bottom of generation sidebar | Extra controls in generation settings.  |

---

## Server API

All routes are under `/api/v1/extensions/`. Auth required for all routes (via
`withExtensionUserId`). Global-scope mutations require admin privileges.

| Method | Path                     | Body / Params              | Description                        |
| ------ | ------------------------ | -------------------------- | ---------------------------------- |
| GET    | `/list`                  | —                          | List visible extensions.           |
| GET    | `/get`                   | `?id=<extId>`              | Get single extension.              |
| POST   | `/install`               | `{ url, branch?, scope? }` | Install from git.                  |
| POST   | `/uninstall`             | `{ id }`                   | Remove extension.                  |
| POST   | `/update`                | `{ id }`                   | Pull latest from git.              |
| POST   | `/updateAll`             | —                          | Update all git-backed exts.        |
| POST   | `/enable`                | `{ id }`                   | Enable extension.                  |
| POST   | `/disable`               | `{ id }`                   | Disable extension.                 |
| POST   | `/patch-settings`        | `{ id, key, value }`       | Patch a settings key.              |
| GET    | `/get-settings`          | `?id=<extId>`              | Get all settings.                  |
| POST   | `/validate`              | Manifest object            | Validate manifest without install. |
| GET    | `/assets/<extId>/<path>` | —                          | Serve extension assets.            |

---

## Reference: hello-world Extension

```js
const api = globalThis.WorldCore;
const { react } = api;

function HelloWorldSlot() {
  const [count, setCount] = react.useState(0);
  const [label, setLabel] = react.useState('hello, world');

  // Subscribe to events — return the unsubscribe fn for cleanup
  react.useEffect(() => {
    const off = api.events.on('new_message', (msg) => {
      setCount((c) => c + 1);
      console.log(`${msg.name}: ${msg.mes}`);
    });
    return off;
  }, []);

  // Access extension settings
  react.useEffect(() => {
    void api.settings.get('label');
  }, []);

  return react.createElement(
    'div',
    { className: 'worldcore-hello-world' },
    react.createElement('span', { className: 'whw-label' }, label),
    react.createElement('span', { className: 'whw-count' }, String(count)),
  );
}

api.registerSlot('chat-input-toolbar', HelloWorldSlot);

api.registerSlashCommand(
  'hello',
  (args) => {
    api.toast.success(`hello slash arg: ${args || '(none)'}`);
  },
  'prints a hello message',
);

globalThis.__WorldCore_activate__('hello-world');
```

---

## Common Pitfalls

### 1. Re-reading `globalThis.WorldCore` in effects or async code

**Wrong:**

```js
react.useEffect(() => {
  globalThis.WorldCore.events.on('chat_changed', handler);
  //          ^^^^^^^^^^^^^^^^^ may be overwritten by a later extension
}, []);
```

**Correct:**

```js
const api = globalThis.WorldCore; // Capture at init
react.useEffect(() => {
  return api.events.on('chat_changed', handler);
}, []);
```

`globalThis.WorldCore` is set to the **last loaded** extension's API after all
extensions activate. Earlier extensions that re-read the global in effects will
see the wrong API or `undefined` if no extension is loaded.

### 2. Forgetting to call `__WorldCore_activate__`

Your extension **must** call `globalThis.__WorldCore_activate__('<ext-id>')` at
the end of its top-level script. Without this call, the loader waits 5 seconds
then marks the extension as timed out.

### 3. Forgetting to unsubscribe from events

`api.events.on()` returns an unsubscribe function. Always return it from React
`useEffect` to prevent memory leaks:

```js
react.useEffect(() => {
  const off = api.events.on('new_message', handler);
  return off; // React calls this on unmount
}, []);
```

### 4. Bundling your own React

Use `globalThis.WorldCore.react`, not a bundled copy. Two React instances cause
hooks to break silently.

### 5. Using absolute URLs in API helpers

`apiGet`, `apiPost`, and `apiFetch` block absolute URLs. Use relative paths:

```js
// Wrong
await apiGet('https://example.com/api/data');

// Correct
await apiGet('/some/endpoint');
```

### 6. Accessing `peerDependencies`

Peer dependencies are not supported in API v1. Set `peerDependencies: []` in
your manifest.
