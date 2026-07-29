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
  - [registerCardSource / unregisterCardSource](#registercardsource--unregistercardsource)
  - [registerSettingsPanel / unregisterSettingsPanel](#registersettingspanel--unregistersettingspanel)
  - [registerStylesheet](#registerstylesheet)
  - [helpers](#helpers)
- [Event Types](#event-types)
- [Slot IDs](#slot-ids)
- [Server API](#server-api)
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

### registerCardSource / unregisterCardSource

```ts
registerCardSource(source: CardSource): void
unregisterCardSource(sourceId: string): void
```

Register a **card source** that the built-in Character Browser panel aggregates
and renders. The browser shell (center viewport section `character-browser`,
opened via the `Browse` nav rail or `Alt+8`) handles search UI, source filter
chips, the card grid, dedup against installed characters, and the
download → import flow. A source extension only **provides data**.

This is the contract for browsing character cards from external libraries
without wiring up custom UI — drop a single `index.js` into
`data/extensions/<your-source>/`, call `registerCardSource`, activate, and the
browser panel picks it up automatically.

#### `CardSource` contract

```ts
interface CardSource {
  /** Stable unique id, lowercase alphanumeric + hyphens (e.g. 'chub'). */
  id: string;
  /** Human-readable name shown on the source filter chip. */
  label: string;
  /** Optional blurb shown in the source info popover. */
  description?: string;
  /**
   * Optional lucide icon name (e.g. 'Library', 'Globe'). The framework resolves
   * it; sources must not bundle lucide or React.
   */
  icon?: string;
  /**
   * Search the source's catalog. The framework auto-detects three return
   * shapes (see below) and normalizes to a single array. If omitted, the
   * source contributes no results in any search query.
   */
  search?: (
    query: string,
    opts?: { cursor?: string; limit?: number },
  ) => CardListing[] | { items: CardListing[]; nextCursor?: string } | AsyncIterable<CardListing>;
  /**
   * Fetch the raw card bytes for a listing. The framework POSTs the returned
   * ArrayBuffer to /api/v1/characters/import, which normalizes the card to
   * chara_card_v3 and writes it to the user's library. Must NOT throw
   * synchronously; reject the returned Promise on error instead.
   */
  fetchCard: (listing: CardListing) => Promise<ArrayBuffer>;
}
```

#### `CardListing` shape

```ts
interface CardListing {
  sourceId: string; // echoes the CardSource.id
  cardId: string; // source-local id, must be non-empty
  name: string; // non-empty (truncated in the grid)
  description?: string;
  avatarUrl?: string; // remote preview URL (validated as a URL by Zod)
  creator?: string;
  tags?: string[]; // first 3 shown in the grid, "+N" overflow
  /**
   * Opaque payload the framework echoes verbatim to fetchCard. The framework
   * never inspects this field — use it to carry source-specific bookkeeping
   * (e.g. `{ id: 42 }` for a remote card id).
   */
  payload?: unknown;
}
```

Both `CardListing` (`CardListingSchema`) and the search options
(`CardSearchOptionsSchema`) are defined as Zod schemas in
`src/shared/schemas/character.ts` and derived as TypeScript types in
`src/shared/types/character.ts`. The `CardSource` interface is a documented
plain-TS exception to the type-first rule because Zod cannot describe function
members — do not extend this exception to data shapes.

#### Search result shapes

The framework auto-detects which variant `search()` returns and normalizes it
into an array. Pick whichever matches your backend; **you do not need to
declare which you're using**.

```js
// 1. Plain array — simplest, fine for static catalogs.
search(query) {
  return cards.filter(c => c.name.includes(query)).map(toListing);
}

// 2. Paginated cursor — for backends that page results. V1 only renders the
//    first page (no infinite-scroll UI yet); nextCursor is stored but unused.
search(query) {
  return fetchJson(`/search?q=${encodeURIComponent(query)}`)
    .then(r => ({ items: r.results, nextCursor: r.next }));
}

// 3. AsyncIterable — for streaming backends.
async function* search(query) {
  for await (const page of streamPages(query)) {
    for (const card of page) yield toListing(card);
  }
}
```

You may also return a `Promise` resolving to any of those shapes. If a source
rejects or throws, that source contributes zero results for the current query
— other sources still render. Source-level errors are logged via the browser
console (the framework does not surface source errors to the user, by design).

#### Dedup behavior

The browser dedups the combined results from all active sources by
`` `${sourceId}::${cardId}` ``, then checks each against the user's installed
characters by `` `${name.toLowerCase()}\u0000${creator || ''}` ``. Cards that
match an installed character render with a `Check` icon and a disabled
"Already in library" button — no duplicate is imported through the browser.

This is **client-side only**. The server-side `importCharacter` overwrites the
PNG file by sanitized name (intentional), so dedup happens before the import
POST to avoid clobbers.

#### Download flow

When the user clicks a card's download button, the framework:

1. Calls `source.fetchCard(listing)` to get raw bytes (PNG, JSON, YAML, or a
   `card.json`-style zip — all formats accepted by the importer).
2. Wraps the `ArrayBuffer` as a `File` in `FormData` under the `'file'` field.
3. POSTs to `/api/v1/characters/import`.
4. Invalidates `['/api/v1/characters/all']` so other components re-fetch.
5. Emits the `character_import` event with `{ id, name }`.
6. Toasts success.

Downloads are serialized (one at a time) in V1.

#### Worked example: Local Library source

This is the preinstalled demo source at `data/extensions/local-library/`. It
lists cards already in the user's library (so the browser's full pipeline —
search, grid, dedup, download, import — can be exercised end-to-end with no
network call):

```js
const api = globalThis.WorldCore;
const SOURCE_ID = 'local-library';

function toListing(c) {
  return {
    sourceId: SOURCE_ID,
    cardId: String(c.id),
    name: c.name || 'Untitled',
    description: c.description || '',
    avatarUrl: '/api/v1/characters/thumbnail?id=' + c.id,
    creator: c.creator || '',
    tags: Array.isArray(c.tags) ? c.tags.slice(0, 5) : [],
    payload: { id: c.id }, // echoed back to fetchCard verbatim
  };
}

api.registerCardSource({
  id: SOURCE_ID,
  label: 'Local Library',
  description: 'Your existing characters available for re-import.',
  icon: 'Library',
  search: function (query) {
    try {
      const list = api.helpers.characters.list(); // returns Promise<ShallowCharacter[]>
      const handle = (chars) => {
        const q = (query || '').toLowerCase().trim();
        if (!q) return [];
        return (chars || [])
          .filter((c) =>
            [c.name, c.description, c.creator, (c.tags || []).join(' ')].some((s) =>
              (s || '').toLowerCase().includes(q),
            ),
          )
          .map(toListing);
      };
      return list && typeof list.then === 'function' ? list.then(handle, () => []) : handle(list);
    } catch (err) {
      api.logger.namespace(SOURCE_ID).error('search threw', err);
      return [];
    }
  },
  fetchCard: function (listing) {
    const id = listing.payload && listing.payload.id;
    if (!id) return Promise.reject(new Error('missing payload.id'));
    // NOTE: api.apiFetch calls res.json() on success — unsuitable for binary.
    // Use raw fetch() for non-JSON responses.
    return fetch('/api/v1/characters/export-png?id=' + encodeURIComponent(id)).then(function (res) {
      if (!res.ok) throw new Error('Export-png failed: ' + res.status);
      return res.arrayBuffer();
    });
  },
});

globalThis.__WorldCore_activate__(SOURCE_ID);
```

#### Lifecycle & teardown

Card sources are tied to the extension's `extId` at registration time (the
framework pins `api.meta.extId`). When the extension is disabled or
uninstalled, `extensionRegistry.clearExtension(extId)` cascades to call
`clearCardSourcesForExtId(extId)`, wiping every source that extension
registered. No manual cleanup is required.

A re-registration with the same `source.id` is idempotent — the second
registration overwrites the first, mirroring `registerPanel` semantics.

#### Validation

`registerCardSource` throws synchronously if:

- `source.id` is empty or whitespace-only
- `source.fetchCard` is missing or not a function

It does **not** validate `source.search` shape or `CardListing` payload shape
at registration time — those are validated at runtime by the framework's
search-result normalization and (for the listing) by the implicit `unknown`
type on `payload`. Source authors are responsible for returning well-shaped
listings; malformed listings may be silently dropped by the grid render.

---

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

## Generation Interceptors

Extensions can intercept and rewrite the in-flight LLM prompt + generation
parameters for a single generation, in transit. Register an interceptor with
`api.registerGenerationInterceptor(id, handler)`. The handler receives a mutable
context object — mutate `ctx.request` in place to rewrite what's sent to the
LLM. Mutations are **transit-time only**: never persisted to chat state,
settings, or the database.

This is the only sync-interceptor surface in the WorldCore API. The existing
event bus (`api.events.on/emit`) is read-only; interceptors are the only way
to modify in-flight data.

### Handler Signature

```js
api.registerGenerationInterceptor('my-ext.interceptor', (ctx) => {
  // ctx.id        — stable opaque string for this generation, useful for
  //                  correlating events across the chunk_received lifecycle
  // ctx.request   — mutable StreamChatRequest (see below)
  // ctx.abort()   — call to short-circuit this generation entirely
  //
  // returns void. mutations to ctx.request are seen by downstream
  // interceptors + the final LLM fetch.

  // Example: append a system reminder to every generation
  ctx.request.messages = [{ role: 'system', content: 'You are concise.' }, ...ctx.request.messages];

  // Example: one-off lower temperature for this generation
  ctx.request.temperature = 0.3;
});
```

### `ctx.request` — Full `StreamChatRequest`

Interceptors have access to the entire assembled request, not just `messages`.

| Field                                                                   | Type                                                      | Notes                                              |
| ----------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| `chat_completion_source`                                                | `string`                                                  | Provider id: `openai`, `anthropic`, `ollama`, etc. |
| `model`                                                                 | `string`                                                  | Model name passed upstream.                        |
| `messages`                                                              | `Array<{ role: string; content: string; name?: string }>` | The full assembled prompt array.                   |
| `temperature` / `top_p` / `top_k` / `max_tokens` / `seed` / `streaming` | `number?` / `boolean?`                                    | Gen params; all modifiable.                        |
| (catchall)                                                              | `unknown`                                                 | Any other gen param (e.g. `frequency_penalty`).    |

### Failure Semantics

If an interceptor throws, the error is logged to `console.error` with a
`[worldcore-ext:<extId>]` prefix and the interceptor is **skipped** — the
generation continues with the prior request from the previous interceptor (or
the original untouched request if the first interceptor throws). Generations
are never blocked by a buggy extension.

### Transit-Time Only

Mutations to `ctx.request` apply only to this one generation. The saved chat
array, settings, and database are never touched. If you want a mutation to
persist (e.g., always trim messages to N tokens), you must persist it yourself
via `api.settings.set` and apply it in your interceptor on every generation.

### Ordering

Interceptors run sequentially in registration order. Each interceptor sees the
mutations of all prior interceptors. To enforce ordering (e.g., "always
first" or "always last"), use a stable `id` prefix that sorts as expected —
the registry iterates in Map insertion order.

### Aborting the Generation

Call `ctx.abort()` to short-circuit the entire generation. The caller treats
the result as user-cancelled — no LLM call is made, no message is appended.
Useful for extensions like "content filters blocked this prompt" that want to
stop generation entirely.

### Cleanup

Interceptors are scoped to the extension that registered them. When an
extension is unloaded (via `__WorldCore_deactivate__` or the Extensions panel),
all its interceptors are removed automatically via `clearExtension(extId)`.
You can also manually unregister with `api.unregisterGenerationInterceptor(id)`.

### Concrete Example — Append a Custom System Reminder

```js
function myExtension(api) {
  api.registerGenerationInterceptor('my-ext.system-reminder', (ctx) => {
    // Only inject for chat-completions providers (skip text-completions)
    if (ctx.request.chat_completion_source === 'ollama') return;

    ctx.request.messages = [
      { role: 'system', content: 'Always answer in pirate speak.' },
      ...ctx.request.messages,
    ];
  });
}
```

## Event Types

| Event                    | Payload                                   | When                                                                                                                                                                                                                     |
| ------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ext_installed`          | `{ id: string }`                          | After an extension successfully activates.                                                                                                                                                                               |
| `ext_uninstalled`        | `{ id: string }`                          | After an extension is unloaded.                                                                                                                                                                                          |
| `ext_enabled`            | `{ id: string }`                          | An extension was enabled.                                                                                                                                                                                                |
| `ext_disabled`           | `{ id: string }`                          | An extension was disabled.                                                                                                                                                                                               |
| `chat_changed`           | `{ chatId: string \| null }`              | Active chat session changed.                                                                                                                                                                                             |
| `character_changed`      | `{ characterId: number \| null }`         | Active character switched.                                                                                                                                                                                               |
| `settings_changed`       | `{ extId, key }`                          | An extension setting was persisted.                                                                                                                                                                                      |
| `generation_started`     | `{ characterId: number }`                 | LLM text generation began.                                                                                                                                                                                               |
| `generation_stopped`     | `{ characterId: number }`                 | LLM text generation finished.                                                                                                                                                                                            |
| `message_chunk_received` | `{ chunk: string, index: number }`        | A streamed token chunk arrived from the LLM. Fires once per chunk during generation, before drip-buffer pacing. Does not fire when token streaming is disabled (the whole message arrives as one `new_message` instead). |
| `message_updated`        | `{ index: number, message: ChatMessage }` | An existing chat message was edited.                                                                                                                                                                                     |
| `message_removed`        | `{ index: number }`                       | A chat message was deleted.                                                                                                                                                                                              |
| `new_message`            | `ChatMessage` (full object)               | A new chat message was appended.                                                                                                                                                                                         |
| `user_initialized`       | `{ userId: string }`                      | User session loaded on app start.                                                                                                                                                                                        |
| `viewport_changed`       | `{ sectionId: SectionId }`                | Active panel changed.                                                                                                                                                                                                    |
| `top_drawer_changed`     | `{ drawerId: TopDrawerId \| null }`       | Top overlay drawer opened or closed.                                                                                                                                                                                     |
| `character_import`       | `{ id: number }`                          | A character was imported.                                                                                                                                                                                                |

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

### 7. Using `apiFetch` / `apiGet` / `apiPost` for binary responses

`apiFetch` (and its `apiGet` / `apiPost` wrappers) calls `res.json()` on a
successful 2xx response. This **throws** when the body is binary (PNG bytes,
zip archives, audio). Card source `fetchCard` implementations and any other
binary-fetch code must use raw `fetch()` with a relative path:

```js
// Wrong — api.json() will throw on PNG bytes
const buf = await api.apiFetch('/characters/export-png?id=42');
//                     ^^^^^^^^^^ Promise<unknown>, then res.json() fails

// Correct — raw fetch, then .arrayBuffer()
const res = await fetch('/api/v1/characters/export-png?id=42');
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const buf = await res.arrayBuffer();
```

Note the path prefix differs: `apiFetch` prepends `/api/v1` for you; raw
`fetch()` requires you to add it (use a relative path to keep it portable).

### 8. Throwing synchronously from `CardSource.search`

The browser panel calls each active source's `search()` inside a `try/catch`
on the Promise chain, but a **synchronous throw** escapes the chain and aborts
the entire search (all sources lose their results) before the catch runs.
Always catch your own setup errors and return `[]`:

```js
// Wrong — synchronous throw aborts every source's search
search(query) {
  const items = someSyncApiThatMightThrow(query);
  return items;
}

// Correct — catch and return empty
search(query) {
  try {
    return someSyncApiThatMightThrow(query) ?? [];
  } catch (err) {
    api.logger.namespace('my-source').error('search threw', err);
    return [];
  }
}
```

For `fetchCard`, the contract is the inverse: **reject** the returned Promise
rather than throwing synchronously (the framework wraps the call in `await`
and surfaces the rejection as an error toast for that specific card).
