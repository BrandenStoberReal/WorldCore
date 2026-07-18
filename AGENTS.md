# WorldCore

## Mandatory precommit commands (all must pass before commit)

bun install # ensure deps locked
bun run typecheck # tsc --noEmit
bun test # bun's built-in test runner
bun run build # Bun.build production bundle

## Architecture

- Backend: src/server/ (see src/server/app.ts)
- Frontend: src/App.tsx, src/routes/, src/components/
- Shared types/schemas: src/shared/
- LLM adapters: src/server/backends/
- Tests: tests/ + inline **tests**

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

## Lint

- No `any` outside test files
- Type-first development: define Zod schema → derive TS type
