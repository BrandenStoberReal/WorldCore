# src/components/

React components. shadcn/ui primitives in `ui/`, domain components at root, drawer system in `drawers/`.

## STRUCTURE

```
components/
├── ui/                 # shadcn/ui primitives (Button, Input, Select, etc.)
├── drawers/            # DrawerShell, navigation drawers
├── connections/        # LLM provider forms (ChatCompletionPanel, etc.)
├── CharacterForm.tsx   # Character edit/create form (1238 lines — largest file)
├── CharacterSelector.tsx # Character list + selection
├── CharacterCard.tsx   # Character display card
├── ChatView.tsx        # Chat message list + generation
├── ChatInput.tsx       # Chat message input
├── ChatMessage.tsx     # Single message rendering
├── GenerationSidebar.tsx # Generation parameters sidebar
├── GenerationSlider.tsx  # Parameter slider
├── GenerationModeToggle.tsx # Mode toggle (chat/instruct)
├── ConnectionProfileForm.tsx # Connection profile editor
├── DragDropOverlay.tsx  # Drag-and-drop overlay
├── EditableTags.tsx    # Tag editing component
├── InlineEdit.tsx      # Inline text editing
├── Modal.tsx           # Modal dialog
├── TopBar.tsx          # Top navigation bar
├── CodeBlock.tsx       # Code syntax highlighting
└── ConfirmDialog.tsx   # Confirmation dialog
```

## CONVENTIONS

- **shadcn primitives**: Import from `@/components/ui/` — never modify directly.
- **Drawer-based navigation**: No React Router. Panels render inside `DrawerShell`.
- **Large components**: `CharacterForm.tsx` (1238 lines) and `CharacterSelector.tsx` (533 lines) are complex — extract subcomponents when adding features.
- **Connection forms**: Each LLM provider has its own form in `connections/`.

## WHERE TO LOOK

| Task                     | File                                               | Notes                                |
| ------------------------ | -------------------------------------------------- | ------------------------------------ |
| Add shadcn component     | `ui/`                                              | Use `bunx shadcn-ui add <component>` |
| Add page panel           | `src/panels/`                                      | Not here                             |
| Add LLM provider form    | `connections/<provider>Form.tsx`                   | Follow existing pattern              |
| Modify character editing | `CharacterForm.tsx`                                | Complex — read carefully             |
| Modify chat UI           | `ChatView.tsx`, `ChatInput.tsx`, `ChatMessage.tsx` |                                      |

## ANTI-PATTERNS

- **Never** modify `ui/` components directly — they're shadcn-generated.
- **Never** add React Router — navigation uses drawer system.
- **Never** put business logic in components — extract to hooks or services.
