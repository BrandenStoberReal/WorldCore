# src/shared/

Zod schemas + derived TypeScript types. Type-first development: define schema → derive type.

## STRUCTURE

```
shared/
├── constants.ts        # API_VERSION_PREFIX, DEFAULT_USER, shared constants
├── schemas/            # Zod schemas (validation + type source)
│   ├── character.ts    # Character schemas (v2, v3, create, update)
│   ├── chat.ts         # Chat message schemas
│   ├── preset.ts       # Generation preset schemas
│   ├── backends/       # Backend-specific schemas (openai, anthropic, etc.)
│   └── __tests__/      # Schema validation tests
└── types/              # Derived TS types from schemas
    ├── character.ts    # Character, CharacterCreate, CharacterUpdate
    ├── chat.ts         # ChatMessage, ChatSession
    ├── preset.ts       # Preset, PresetCreate
    └── backends/       # Backend-specific types
```

## CONVENTIONS

- **Schema-first**: Define Zod schema in `schemas/`, derive type in `types/`.
- **Never reverse**: Don't define TS type first, then schema.
- **Parallel structure**: Every `schemas/X.ts` has matching `types/X.ts` (except `connection-profile`).
- **Import patterns**: `import { CharacterSchema } from '@/shared/schemas/character'`
- **Type imports**: `import type { Character } from '@/shared/types/character'`

## WHERE TO LOOK

| Task               | File                             | Notes                       |
| ------------------ | -------------------------------- | --------------------------- |
| Add entity schema  | `schemas/<entity>.ts`            | Define Zod schema           |
| Add entity type    | `types/<entity>.ts`              | `z.infer<typeof Schema>`    |
| Add backend schema | `schemas/backends/<provider>.ts` | OpenAI, Anthropic, etc.     |
| Add backend type   | `types/backends/<provider>.ts`   | Derived from backend schema |
| Add constant       | `constants.ts`                   | Shared across server/client |

## ANTI-PATTERNS

- **Never** define TS type without matching Zod schema.
- **Never** use `z.infer` inline — export the derived type.
- **Never** put runtime logic in schemas — validation only.
