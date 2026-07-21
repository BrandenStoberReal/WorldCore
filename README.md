# WorldCore

Bun monolith: server + React 19 SPA in one process. TypeScript 7, Tailwind v4, shadcn/ui, Drizzle ORM/SQLite, Zustand, TanStack Query, Zod.

## Getting Started

```bash
bun install
bun dev
```

## Commands

| Command               | Description              |
| --------------------- | ------------------------ |
| `bun dev`             | Hot-reload dev server    |
| `bun start`           | Production server        |
| `bun run build`       | Production bundle        |
| `bun test`            | Run tests                |
| `bun run typecheck`   | TypeScript check         |
| `bun run format`      | Prettier write           |
| `bun run db:migrate`  | Run Drizzle migrations   |
| `bun run db:generate` | Generate migration files |

## Tech Stack

- **Runtime**: Bun (not Node.js)
- **Frontend**: React 19, Tailwind v4, shadcn/ui, Zustand, TanStack Query
- **Backend**: Bun HTTP server, TypeScript 7
- **Database**: SQLite via Drizzle ORM
- **Validation**: Zod (type-first: schema → type)
- **Navigation**: Drawer-based panels (no React Router)

## Project Structure

```
src/
├── server/        # Routes, services, auth, DB
├── shared/        # Zod schemas + types
├── components/    # React components (shadcn/ui)
├── panels/        # Page-level panels
├── hooks/         # React hooks
├── lib/           # Frontend utilities
├── App.tsx        # Root component
└── index.ts       # Server entry
```

## Key Conventions

- Define Zod schema first, derive TypeScript type (never reverse)
- No `any` outside test files
- Manual route registration in `src/server/routes/index.ts`
- Auth, CSRF, rate limiting called inside handlers (no global middleware)
- Dual entry points: `src/index.ts` (server) + `src/frontend.tsx` (client)
