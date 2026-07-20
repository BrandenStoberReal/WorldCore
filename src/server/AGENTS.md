# src/server/

Bun HTTP server with manual route dispatch. No framework (Express/Hono) — raw `serve()` with flat `Record<string, RouteHandler>` map.

## STRUCTURE

```
server/
├── app.ts              # Server entry: Bun.serve(), route dispatch, static files
├── config.ts           # Config loader (unused by app.ts — reads env directly)
├── env.ts              # Environment variable helpers
├── errors.ts           # ApiError class, security headers
├── routes/             # 40 API route modules + manual registration
├── services/           # Business logic (character CRUD, chat, backup, etc.)
├── middleware/          # Auth, CSRF, rate limiting, validation (called inside handlers)
├── auth/               # Session HMAC, withUserId HOF
├── backends/           # LLM adapters (chat-completions, text-completions)
├── db/                 # Drizzle schema, migrations, migrate.ts
├── storage/            # File system paths, JSONL read/write
├── providers/          # Translation, search providers
├── importers/          # Character import (JSON/YAML)
├── exporters/          # Character export
├── tokenizers/         # Tiktoken, sentencepiece wrappers
├── util/               # safePath, misc helpers
├── test/               # Test preload setup (in-memory SQLite)
└── __tests__/          # Bootstrap integration tests
```

## WHERE TO LOOK

| Task                  | File                                               | Notes                                  |
| --------------------- | -------------------------------------------------- | -------------------------------------- |
| Add API route         | `routes/<name>.routes.ts` + edit `routes/index.ts` | 40 manual registrations                |
| Add service           | `services/<name>.service.ts`                       | Business logic, calls db/storage       |
| Add middleware        | `middleware/<name>.ts`                             | Call inside route handlers, not global |
| Add auth check        | `middleware/auth.ts`                               | `requireAuth(req)` returns session     |
| Add user scoping      | `middleware/withUserId.ts`                         | `withUserId(req, handler)` HOF         |
| Add DB table          | `db/schema.ts`                                     | Drizzle ORM, then `db:generate`        |
| Add LLM adapter       | `backends/`                                        | See backends/AGENTS.md                 |
| Add importer/exporter | `importers/` or `exporters/`                       | Character format conversion            |

## CONVENTIONS

- **No global middleware**: Auth, CSRF, rate limiting are called inside route handlers.
- **Route handlers receive raw Request**: No framework abstraction, no path params.
- **Service layer**: Routes delegate to services for business logic.
- **Storage paths**: Use `storage/paths.ts` helpers, never hardcode `data/` paths.
- **Error handling**: Throw `ApiError` with code + message, caught by global handler.

## ANTI-PATTERNS

- **Never** read `process.env` directly in route handlers — use `env.ts` or `config.ts`.
- **Never** hardcode `data/` paths — use `storage/paths.ts` helpers.
- **Never** skip auth middleware in routes — all routes require `requireAuth()` unless explicitly public.
- **Never** mutate request objects — clone if needed.
