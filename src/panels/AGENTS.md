# src/panels/

Page-level panels. Drawer-based navigation — no React Router.

## STRUCTURE

```
panels/
├── CharactersPanel.tsx    # Character list + management
├── ChatsPanel.tsx         # Chat session list
├── ConnectionsPanel.tsx   # LLM provider connections
├── ExtensionsPanel.tsx    # Extension management
├── GenerationPanel.tsx    # Generation parameters
├── LorebookPanel.tsx      # World info / lorebook (647 lines)
├── SettingsPanel.tsx      # App settings
├── TextOptionsPanel.tsx   # Text generation options (1331 lines — largest)
└── WorldInfoPanel.tsx     # World info editor (547 lines)
```

## CONVENTIONS

- **Panel registration**: Wire into `DrawerShell.tsx` TOP_DRAWER_PANELS map + add section ID to `navStore.ts`.
- **Drawer-based nav**: Panels render inside `DrawerShell`, not React Router routes.
- **Autosave**: `TextOptionsPanel` uses `useDebouncedAutoSave` hook — others use manual save.
- **Large panels**: `TextOptionsPanel.tsx` (1331 lines) and `LorebookPanel.tsx` (647 lines) are complex — extract subcomponents when adding features.

## WHERE TO LOOK

| Task           | File                                    | Notes                             |
| -------------- | --------------------------------------- | --------------------------------- |
| Add new panel  | Create `<Name>Panel.tsx`                | Wire into DrawerShell + navStore  |
| Add autosave   | See `src/hooks/useDebouncedAutoSave.ts` | Never invalidate same query       |
| Modify chat UI | `src/components/ChatView.tsx`           | Not here — components, not panels |

## ANTI-PATTERNS

- **Never** add React Router — navigation uses drawer system.
- **Never** put business logic in panels — extract to hooks or services.
- **Never** invalidate autosave's query — causes re-fetch loop guard hit.
