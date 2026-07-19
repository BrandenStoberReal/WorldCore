# src/server/routes/

40 API route modules. Manual registration in `index.ts` — no auto-discovery.

## STRUCTURE

```
routes/
├── index.ts                    # Route registry: builds flat map from 40 modules
├── characters.routes.ts        # Character CRUD (uses withUserId HOF)
├── chats.routes.ts             # Chat session management
├── presets.routes.ts            # Generation presets
├── settings.routes.ts           # User settings
├── users.private.routes.ts      # Private user routes
├── users.public.routes.ts       # Public user routes
├── users.admin.routes.ts        # Admin routes
├── connection-profiles.routes.ts # LLM connection profiles
├── worldinfo.routes.ts          # World info / lorebook
├── groups.routes.ts             # Character groups
├── secrets.routes.ts            # API key storage
├── backups.routes.ts            # Backup/restore
├── speech.routes.ts             # TTS/STT
├── translate.routes.ts          # Translation
├── search.routes.ts             # Vector search
├── tokenizers.routes.ts         # Token counting
├── prompt-builder.routes.ts     # Prompt construction
├── extensions.routes.ts         # Extension management
├── themes.routes.ts             # UI themes
├── vectors.routes.ts            # Vector embeddings
├── sso.routes.ts                # Single sign-on
├── avatars.routes.ts            # Avatar upload
├── assets.routes.ts             # Asset management
├── backgrounds.routes.ts        # Background images
├── thumbnails.routes.ts         # Thumbnail generation
├── sprites.routes.ts            # Sprite management
├── imageMetadata.routes.ts      # Image metadata
├── sd.routes.ts                 # Stable Diffusion
├── caption.routes.ts            # Image captioning
├── classify.routes.ts           # Image classification
├── content.routes.ts            # Content management
├── datamaids.routes.ts          # Data maintenance
├── files.routes.ts              # File management
├── movingui.routes.ts           # Moving UI elements
├── quickreplies.routes.ts       # Quick reply presets
├── csrf.routes.ts               # CSRF token endpoint
├── stats.routes.ts              # Usage statistics
├── backends/                    # Backend-specific routes
│   ├── chatcompletions.routes.ts
│   └── textcompletions.routes.ts
└── __tests__/                   # Route tests (14 files)
```

## CONVENTIONS

- **File naming**: `<domain>.routes.ts` — kebab domain, `.routes.ts` suffix.
- **Registration**: Each route imported in `index.ts`, wired into flat map.
- **Route prefix**: All routes under `/api/v1/` (from `SHARED_CONST.API_VERSION_PREFIX`).
- **Auth**: Routes call `requireAuth(req)` inside handler, not global middleware.
- **User scoping**: Character routes use `withUserId(req, handler)`.

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Add new route | `<domain>.routes.ts` + edit `index.ts` | 40 manual registrations |
| Add route test | `__tests__/<domain>.test.ts` | Direct `new Request()` construction |
| Modify auth | See `middleware/auth.ts` | Called inside handlers |
| Add user scoping | See `middleware/withUserId.ts` | Character routes only |

## ANTI-PATTERNS

- **Never** forget to register new routes in `index.ts` — they won't be accessible.
- **Never** use global middleware — call inside handlers.
- **Never** skip auth — all routes require `requireAuth()` unless explicitly public.
