# src/server/backends/

LLM provider adapters. Two subdirectories: `chat-completions/` and `text-completions/`.

## STRUCTURE

```
backends/
├── chat-completions/           # Chat completion adapters
│   ├── openai.adapter.ts       # OpenAI/GPT
│   ├── anthropic.adapter.ts    # Anthropic/Claude
│   ├── google.adapter.ts       # Google Gemini
│   ├── groq.adapter.ts         # Groq
│   ├── together.adapter.ts     # Together AI
│   ├── openrouter.adapter.ts   # OpenRouter
│   ├── featherless.adapter.ts  # Featherless
│   ├── textgen.adapter.ts      # Text generation webui
│   ├── kobold.adapter.ts       # KoboldAI
│   ├── novel.adapter.ts        # NovelAI
│   ├── deepseek.adapter.ts     # DeepSeek
│   ├── xai.adapter.ts          # xAI/Grok
│   ├── mistral.adapter.ts      # Mistral
│   ├── fireworks.adapter.ts    # Fireworks
│   ├── inflection.adapter.ts   # Inflection
│   ├── mancer.adapter.ts       # Mancer
│   ├── vllm.adapter.ts         # vLLM
│   ├── zai.adapter.ts          # Z.AI
│   └── __tests__/              # Adapter tests
└── text-completions/           # Text completion adapters
    ├── openai.adapter.ts       # OpenAI completions
    ├── anthropic.adapter.ts    # Anthropic completions
    ├── groq.adapter.ts         # Groq completions
    ├── together.adapter.ts     # Together completions
    ├── openrouter.adapter.ts   # OpenRouter completions
    ├── textgen.adapter.ts      # TextGen completions
    ├── kobold.adapter.ts       # Kobold completions
    ├── novel.adapter.ts        # Novel completions
    ├── deepseek.adapter.ts     # DeepSeek completions
    └── __tests__/              # Adapter tests
```

## CONVENTIONS

- **Adapter pattern**: Each provider implements the same interface.
- **Naming**: `<provider>.adapter.ts` — kebab dirs, camelCase files.
- **Shared schemas**: Backend-specific schemas in `@/shared/schemas/backends/`.
- **Tests**: Co-located `__tests__/` directories.

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Add chat provider | `chat-completions/<provider>.adapter.ts` | Implement adapter interface |
| Add text provider | `text-completions/<provider>.adapter.ts` | Implement adapter interface |
| Add provider schema | `@/shared/schemas/backends/<provider>.ts` | Zod schema for config |
| Add provider type | `@/shared/types/backends/<provider>.ts` | Derived type |

## ANTI-PATTERNS

- **Never** mix chat and text completion logic — they're separate adapter types.
- **Never** hardcode provider-specific logic in routes — always go through adapter.
