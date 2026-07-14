# WorldCore

## Mandatory precommit commands (all must pass before commit)

bun install          # ensure deps locked
bun run typecheck    # tsc --noEmit
bun test             # bun's built-in test runner
bun run build        # Bun.build production bundle

## Architecture
- Backend: src/server/ (see src/server/app.ts)
- Frontend: src/App.tsx, src/routes/, src/components/
- Shared types/schemas: src/shared/
- LLM adapters: src/server/backends/
- Tests: tests/ + inline __tests__

## Lint
- No `any` outside test files
- Type-first development: define Zod schema → derive TS type
