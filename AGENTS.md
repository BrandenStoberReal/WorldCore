# WorldCore

**Generated:** 2026-07-19T03:18:27Z
**Commit:** 12c90a7
**Branch:** master

## OVERVIEW

Bun monolith: server + React 19 SPA in one process. TypeScript 7, Tailwind v4, shadcn/ui, Drizzle ORM/SQLite, Zustand, TanStack Query, Zod.

## STRUCTURE

```
slopforge/
├── src/
│   ├── server/          # Bun HTTP server, routes, services, auth, db
│   ├── shared/          # Zod schemas + TS types (type-first dev)
│   ├── components/      # React components (shadcn/ui, drawers, connections)
│   ├── panels/          # Page-level panels (drawer-based navigation)
│   ├── hooks/           # React hooks (autosave, etc.)
│   ├── lib/             # Frontend utilities (stores, query client, api)
│   ├── App.tsx          # Root React component
│   └── index.ts         # Server entry (re-exports server/app.ts)
├── tests/               # Cross-cutting tests + fixtures
├── styles/              # shadcn globals.css (outside src/)
├── data/                # Runtime: SQLite, user dirs, backups (gitignored)
└── dist/                # Production bundle output
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add API route | `src/server/routes/` + register in `routes/index.ts` | 40 manual registrations, no auto-discovery |
| Add LLM backend | `src/server/backends/chat-completions/` or `text-completions/` | Adapter pattern per provider |
| Add Zod schema | `src/shared/schemas/` | Derive TS type → `src/shared/types/` |
| Add React component | `src/components/` | shadcn primitives in `ui/` |
| Add page panel | `src/panels/` | Drawer-based nav, not React Router |
| Add autosave | `src/hooks/useDebouncedAutoSave.ts` | See autosave rules below |
| Add middleware | `src/server/middleware/` | Called inside route handlers, not global |
| Modify auth | `src/server/auth/` | Session HMAC, `withUserId` HOF |
| Modify DB schema | `src/server/db/schema.ts` | Drizzle ORM, SQLite |
| Add test | `src/<domain>/__tests__/` or `tests/` | Bun test runner, no mocking library |

## CONVENTIONS

- **Type-first**: Define Zod schema → derive TS type. Never reverse.
- **No `any`** outside test files.
- **Manual route registration**: Each route requires edit to `src/server/routes/index.ts`.
- **No global middleware**: Auth, CSRF, rate limiting called inside handlers.
- **Dual entry points**: `src/index.ts` (server) + `src/frontend.tsx` (React client).
- **Panel-based navigation**: No React Router. `src/panels/` + drawer system.
- **Bun-only runtime**: No Node.js compatibility. Deploy requires Bun.

## ANTI-PATTERNS (THIS PROJECT)

- **Never** put save/equals/delayMs in autosave effect dep arrays (stable refs via `.current`).
- **Never** invalidate autosave's query — causes re-fetch loop guard hit.
- **Never** retrofit user-scoping to non-character domains without explicit task.
- **Never** change `DEFAULT_USER` fallback without coordinating.
- **Never** land ephemeral config in settings patch (ChatCompletionPanel).
- **Never** touch `default-user` dirs in test cleanup.
- **Never** use `as any`, `@ts-ignore`, `@ts-expect-error`.

## COMMANDS

```bash
bun install              # Ensure deps locked
bun run typecheck        # tsc --noEmit
bun test                 # Bun's built-in test runner
bun run build            # Bun.build production bundle
bun dev                  # Hot-reload dev server
bun run format           # Prettier write
bun run format:check     # Prettier check
bun run db:migrate       # Drizzle migrations
bun run db:generate      # Generate migration files
```

## NOTES

- **No CI/CD**: No GitHub Actions, no Docker, no automated checks.
- **No ESLint**: Only Prettier for formatting. "No `any`" rule is manual.
- **No lockfile committed**: `bun.lockb` is gitignored. Deps not pinned.
- **Missing MIME types**: `app.ts` only maps 6 extensions. Add `.woff2`, `.ico`, etc. as needed.
- **Inline seed SQL**: `src/server/db/migrate.ts` has hardcoded DDL outside Drizzle migrations.
- **9 TODO test stubs**: `tests/hooks/useDebouncedAutoSave.test.tsx` — blocked on bun:test DOM support.
- **Orphan files**: `src/APITester.tsx`, `src/logo.svg`, `src/react.svg` are unused leftovers.

## Per-user character persistence scope

Character data (cards + SQLite rows) is scoped by the authenticated user. **Character routes ONLY** use the `withUserId` HOF to resolve session→userId and eagerly ensure each user's character dir. Other domains (settings, chats, presets, worldinfo, connections, secrets, assets) still resolve against `DEFAULT_USER` — do NOT retrofit them without an explicit task.

- `resolveUserFromSession(session)` is synchronous and trusts the HMAC-signed `session.userId` (no DB lookup per character request). The `/users/me` endpoint enriches via `getUserById` separately.
- No-session fallback always resolves to `DEFAULT_USER` (literal id `'default-user'`), preserving local dev parity. Never change this fallback without coordinating.
- Storage layout for characters: `data/{userId}/characters/` (via `getUserCharacterPath`). The `characters.userId` DB column scopes all queries with `and(eq(characters.id, id), eq(characters.userId, userId))`.
- `importCharacter` (importer) and `exportCharacter` (exporter) both accept `userId: string` as a parameter threaded from the route handlers.

## Frontend autosave

`useDebouncedAutoSave<T>` (`src/hooks/useDebouncedAutoSave.ts`) is the generic debounced autosave hook. Two thin wrappers exist:

- CharacterForm edit mode (NOT create mode — create stays manual) lives in `CharacterSelector.tsx` near the edit Mutation. Avatar uploads stay manual (separate `/edit-avatar` endpoint with binary FS writes).
- TextOptionsPanel uses the hook directly, dropping its manual SAVE button. The autosave hook's setLocal only accepts `T` (not `(prev)=>next` updater functions) — the panel wraps it with a `setForm` adapter that handles both call patterns so the ~30 existing `setForm((f) => ...)` call sites work unchanged.

When wiring new autosave consumers: never invalidate the same query the autosave reads from — the hook's reseed effect handles local-vs-baseline sync, and invalidating on save causes a re-fetch loop guard hit. Settings save is idempotent, no other component needs fresh state on save.
