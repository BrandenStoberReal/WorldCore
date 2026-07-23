# src/server/services/

Business logic layer. Routes delegate here; services call db/storage/backends.

## STRUCTURE

```
services/
├── character.service.ts      # Character CRUD (688 lines — largest service)
├── character-folder.service.ts # Character folder operations
├── character-watcher.ts      # FS watcher for character PNGs
├── chat.service.ts           # Chat session management + streaming
├── connection-profile.service.ts # LLM connection profile CRUD
├── extensions.service.ts     # Extension management
├── group.service.ts          # Character group CRUD
├── preset.service.ts         # Generation presets + default seeding
├── prompt-builder.ts         # Prompt construction from character + worldinfo
├── secrets.service.ts        # API key storage (encrypted)
├── settings.service.ts       # User settings persistence
├── streaming.service.ts      # SSE streaming to frontend
├── vectors.service.ts        # Vector embeddings + search
├── worldinfo.service.ts      # World info / lorebook CRUD
├── preset/                   # Preset sub-module
└── __tests__/                # Service tests (5 files)
```

## CONVENTIONS

- **Service pattern**: Each service exports functions, not classes. No DI.
- **Storage paths**: Use `storage/paths.ts` helpers, never hardcode `data/` paths.
- **DB access**: Import from `db/index.ts`, use Drizzle query builder.
- **Error handling**: Throw `ApiError` with code + message.
- **User scoping**: Character services receive `userId` from route handlers via `withUserId` HOF.

## WHERE TO LOOK

| Task                   | File                            | Notes                       |
| ---------------------- | ------------------------------- | --------------------------- |
| Add character feature  | `character.service.ts`          | Complex — read carefully    |
| Add chat feature       | `chat.service.ts`               | Streaming via SSE           |
| Add preset feature     | `preset.service.ts`             | `seedDefaults()` on startup |
| Add worldinfo feature  | `worldinfo.service.ts`          | Lorebook CRUD               |
| Add connection feature | `connection-profile.service.ts` | LLM provider profiles       |

## ANTI-PATTERNS

- **Never** read `process.env` directly — use `env.ts` or `config.ts`.
- **Never** hardcode `data/` paths — use `storage/paths.ts` helpers.
- **Never** bypass service layer — routes must not call db/storage directly.
- **Never** use `getAll(userId)` / `getAll(userId, true)` in character-folder.service.ts.
