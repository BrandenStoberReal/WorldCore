# Frontend Test Suite: Nitpick & Bug Detection

**Generated**: 2026-08-11
**Purpose**: Comprehensive test coverage to catch accessibility issues, memory leaks, edge cases, and UX bugs in the React frontend.

---

## Priority 1: Critical Bugs (Memory Leaks & A11y Blockers)

### 1.1 Memory Leak: Thinking Timer Interval

**Issue**: `ChatMessage.tsx:164-172` and `MobileChatMessage.tsx:149-157` create `setInterval` without cleanup return. If component unmounts while streaming, interval leaks indefinitely.

**Test File**: `tests/components/ChatMessage.leak.test.tsx`

```
Test: "thinking timer interval is cleaned up on unmount"
- Render ChatMessage with isStreaming=true, thinkingContent="test"
- Verify interval is created (mock setInterval)
- Unmount component
- Assert interval was cleared (mock clearInterval called)
- Assert no setState calls after unmount

Test: "thinking timer resets when streaming stops"
- Render with isStreaming=true, thinkingContent="test"
- Set isStreaming=false
- Assert interval was cleared
- Assert liveThinkingElapsed stops updating
```

**Acceptance Criteria**:
- [ ] `useEffect` for thinking timer returns cleanup function
- [ ] Interval cleared on unmount
- [ ] Interval cleared when `isStreaming` becomes false

---

### 1.2 Accessibility: Clickable Elements Without Keyboard Support

**Issue**: `CharacterCard.tsx:25-34` (`<article onClick>`) and `Onboarding.tsx:110-118` (`<Card onClick>`) have no `role`, `tabIndex`, or `onKeyDown`.

**Test File**: `tests/components/CharacterCard.a11y.test.tsx`

```
Test: "character card is keyboard accessible"
- Render CharacterCard with onSelect handler
- Query by role="button" OR verify tabIndex={0} exists
- Simulate Tab focus
- Simulate Enter keypress
- Assert onSelect called

Test: "character card has correct ARIA role"
- Render CharacterCard
- Assert element has role="button" OR role="article" with aria-label
```

**Test File**: `tests/components/Onboarding.a11y.test.tsx`

```
Test: "backend selection card is keyboard accessible"
- Render Onboarding with backend list
- Query selectable cards
- Simulate Tab + Enter
- Assert selection handler called

Test: "onboarding has proper heading hierarchy"
- Render Onboarding
- Assert h1/h2/h3 hierarchy is sequential (no skipped levels)
```

**Acceptance Criteria**:
- [ ] CharacterCard has `role="button"`, `tabIndex={0}`, `onKeyDown`
- [ ] Onboarding cards have keyboard support
- [ ] All tests pass

---

### 1.3 Accessibility: Dialog Modals Missing aria-labelledby

**Issue**: `Modal.tsx:90` and `MobileModal.tsx:81` have `role="dialog"` without `aria-labelledby`.

**Test File**: `tests/components/Modal.a11y.test.tsx`

```
Test: "modal has aria-labelledby pointing to title"
- Render Modal with title="Test Dialog"
- Query dialog element
- Assert aria-labelledby attribute exists
- Assert referenced ID exists on title element

Test: "mobile modal has aria-labelledby"
- Render MobileModal with title
- Same assertions as above
```

**Acceptance Criteria**:
- [ ] Modal.tsx adds `id` to title h2 and `aria-labelledby` to dialog
- [ ] MobileModal.tsx same
- [ ] Tests verify the link exists

---

## Priority 2: Accessibility Gaps

### 2.1 Buttons Using title Only (Not Screen Reader Accessible)

**Issue**: Multiple buttons in `ChatMessage.tsx` (lines 335, 350, 367, 384, 395, 406), `MobileChatMessage.tsx` (320-383), and `ConnectionProfileSelector.tsx` (182-198) use `title` but no `aria-label`.

**Test File**: `tests/components/ChatMessage.a11y.test.tsx`

```
Test: "greeting navigation buttons have aria-label"
- Render ChatMessage with multiple greetings
- Query previous/next greeting buttons
- Assert each has aria-label attribute (not just title)

Test: "hover action buttons have aria-labels"
- Render ChatMessage, hover to reveal actions
- Query Copy, Edit, Regenerate, Delete buttons
- Assert each has aria-label
```

**Test File**: `tests/components/ConnectionProfileSelector.a11y.test.tsx`

```
Test: "action buttons have accessible names"
- Render ConnectionProfileSelector with profiles
- Query action buttons
- Assert each has aria-label or aria-labelledby
```

**Acceptance Criteria**:
- [ ] All icon-only buttons have `aria-label`
- [ ] Screen readers announce button purpose
- [ ] Tests verify aria-label presence

---

### 2.2 Toggle Missing Switch Semantics

**Issue**: `UISettingsPanel.tsx:18-43` Toggle lacks `role="switch"` and `aria-checked`.

**Test File**: `tests/components/UISettingsPanel.a11y.test.tsx`

```
Test: "toggle has switch role and aria-checked"
- Render UISettingsPanel
- Query toggle buttons
- Assert role="switch"
- Assert aria-checked matches visual state

Test: "toggle announces state change"
- Render with initial state
- Click toggle
- Assert aria-checked toggles
```

**Acceptance Criteria**:
- [ ] Toggle has `role="switch"`
- [ ] Toggle has `aria-checked={boolean}`
- [ ] State change announced to screen readers

---

### 2.3 Dialog Controls Missing Accessible Names

**Issue**: `Modal.tsx:116-123` and `MobileModal.tsx:107-113` close buttons have no `aria-label`.

**Test File**: `tests/components/Modal.a11y.test.tsx` (extend 1.3)

```
Test: "close button has aria-label"
- Render Modal
- Query close button
- Assert aria-label="Close" or similar
```

---

## Priority 3: Missing Error States

### 3.1 Character Query Missing Error Handling

**Issue**: `ChatView.tsx:247`, `CharacterEditorPanel.tsx:131`, `CharactersPanel.tsx:89`, `LorebookPanel.tsx:419` use `charLoading` but never check `isError`.

**Test File**: `tests/components/ChatView.error.test.tsx`

```
Test: "displays error when character fetch fails"
- Mock useQuery to return isError=true, error=new Error("Not found")
- Render ChatView
- Assert error message or fallback UI displayed
- Assert no crash/blank screen

Test: "shows loading state during character fetch"
- Mock useQuery to return isLoading=true
- Assert loading indicator shown
```

**Test File**: `tests/components/CharacterEditorPanel.error.test.tsx`

```
Test: "shows error when character not found"
- Mock query to return 404 error
- Assert user sees "Character not found" or similar
```

**Acceptance Criteria**:
- [ ] All 4 components handle `isError` state
- [ ] User sees meaningful error message
- [ ] No blank/crashed screen on error

---

## Priority 4: Input Validation & Edge Cases

### 4.1 Textarea Without maxLength

**Issue**: `ChatMessage.tsx:315-321`, `MobileChatMessage.tsx:299-305`, `ChatInput.tsx:126` have no character limits.

**Test File**: `tests/components/ChatInput.validation.test.tsx`

```
Test: "textarea respects maxLength"
- Render ChatInput with maxLength={10000}
- Type 10001 characters
- Assert input truncated to 10000

Test: "empty message cannot be sent"
- Render ChatInput
- Leave empty, click send
- Assert send handler NOT called

Test: "whitespace-only message cannot be sent"
- Render ChatInput
- Type "   ", click send
- Assert send handler NOT called
```

**Test File**: `tests/components/ChatMessage.edit.test.tsx`

```
Test: "edit textarea prevents empty save"
- Enter edit mode
- Clear textarea
- Click save
- Assert original message preserved

Test: "edit textarea trims whitespace"
- Enter edit mode
- Add leading/trailing spaces
- Save
- Assert message saved without extra whitespace
```

**Acceptance Criteria**:
- [ ] ChatInput has configurable maxLength
- [ ] Empty/whitespace messages blocked
- [ ] Edit mode validates before save

---

### 4.2 GenerationSlider Number Input Clamping

**Issue**: `GenerationSlider.tsx:49-65` allows values outside min/max until next change event.

**Test File**: `tests/components/GenerationSlider.validation.test.tsx`

```
Test: "number input clamps to min/max on blur"
- Render with min=0, max=1
- Type "1.5" in number input
- Blur input
- Assert value clamped to 1

Test: "number input rejects non-numeric input"
- Render slider
- Type "abc"
- Assert value unchanged or reverted
```

**Acceptance Criteria**:
- [ ] Input values clamped on blur
- [ ] Invalid input rejected
- [ ] Visual feedback for out-of-range

---

## Priority 5: Component Behavior & Edge Cases

### 5.1 ChatMessage Greeting Navigation

**Test File**: `tests/components/ChatMessage.greetings.test.tsx`

```
Test: "cycles through greetings with arrow buttons"
- Render with character having 3 greetings
- Click next → greeting 2
- Click next → greeting 3
- Click next → wraps to greeting 1

Test: "hides navigation when only one greeting"
- Render with character having 1 greeting
- Assert navigation buttons not rendered
```

### 5.2 Modal Focus Trap

**Test File**: `tests/components/Modal.focus.test.tsx`

```
Test: "focus trapped within modal"
- Render Modal with multiple focusable elements
- Tab through all elements
- Assert focus cycles within modal (doesn't escape)

Test: "Escape closes modal"
- Render open Modal
- Press Escape
- Assert onClose called

Test: "click outside closes modal"
- Render Modal
- Click overlay/backdrop
- Assert onClose called
```

### 5.3 Character Card Selection State

**Test File**: `tests/components/CharacterCard.selection.test.tsx`

```
Test: "selected card has visual indicator"
- Render CharacterCard with isSelected=true
- Assert aria-pressed or similar state attribute
- Assert visual highlight class applied

Test: "clicking selected card does not re-trigger"
- Render with isSelected=true, onSelect mock
- Click card
- Assert onSelect called (for deselection) or not called (if single-select)
```

---

## Priority 6: Performance & Bundle Size

### 6.1 Large Component Render Performance

**Test File**: `tests/components/performance.test.tsx`

```
Test: "ChatView renders within 500ms with 100 messages"
- Mock 100 messages
- Measure render time
- Assert < 500ms

Test: "GenerationSidebar renders within 300ms"
- Mock default settings
- Measure render time
- Assert < 300ms
```

### 6.2 Memoization Verification

**Test File**: `tests/components/memo.test.tsx`

```
Test: "CharacterCard re-renders only when props change"
- Wrap in React.Profiler
- Render with same props
- Assert render count = 1
- Update parent state (not card props)
- Assert render count still = 1
```

---

## Priority 7: Integration & State Management

### 7.1 Zustand Store Interactions

**Test File**: `tests/lib/stores.test.ts`

```
Test: "useAppStore.initSettings writes to useGenerationStore"
- Call initSettings with preset values
- Assert generationStore updated

Test: "useChatStore.clearChat resets streaming state"
- Set streaming state
- Call clearChat
- Assert isStreaming=false, messages=[]
```

### 7.2 Autosave Hook Edge Cases

**Test File**: `tests/hooks/useDebouncedAutoSave.edge.test.tsx`

```
 rapid updates within debounce window → only final value saved"
- Update 10 times within 500ms
- Assert save called once with final value

Test: "autosave does not re-fetch same query"
- Mock useQuery
- Trigger autosave
- Assert query not invalidated
```

---

## Test File Structure

```
tests/
├── components/
│   ├── ChatMessage.leak.test.tsx
│   ├── ChatMessage.a11y.test.tsx
│   ├── ChatMessage.greetings.test.tsx
│   ├── ChatMessage.edit.test.tsx
│   ├── MobileChatMessage.leak.test.tsx
│   ├── CharacterCard.a11y.test.tsx
│   ├── CharacterCard.selection.test.tsx
│   ├── Onboarding.a11y.test.tsx
│   ├── Modal.a11y.test.tsx
│   ├── Modal.focus.test.tsx
│   ├── MobileModal.a11y.test.tsx
│   ├── UISettingsPanel.a11y.test.tsx
│   ├── ChatInput.validation.test.tsx
│   ├── GenerationSlider.validation.test.tsx
│   ├── ConnectionProfileSelector.a11y.test.tsx
│   ├── ChatView.error.test.tsx
│   ├── CharacterEditorPanel.error.test.tsx
│   └── performance.test.tsx
├── hooks/
│   └── useDebouncedAutoSave.edge.test.tsx
└── lib/
    └── stores.test.ts
```

---

## Implementation Checklist

### Phase 1: Critical Bugs (Week 1)
- [ ] Fix thinking timer memory leak in ChatMessage.tsx
- [ ] Fix thinking timer memory leak in MobileChatMessage.tsx
- [ ] Add keyboard support to CharacterCard.tsx
- [ ] Add keyboard support to Onboarding.tsx
- [ ] Add aria-labelledby to Modal.tsx
- [ ] Add aria-labelledby to MobileModal.tsx
- [ ] Write all Phase 1 tests

### Phase 2: Accessibility (Week 2)
- [ ] Add aria-labels to ChatMessage action buttons
- [ ] Add aria-labels to MobileChatMessage action buttons
- [ ] Add role="switch" to UISettingsPanel Toggle
- [ ] Add aria-labels to Modal close buttons
- [ ] Write all Phase 2 tests

### Phase 3: Error States & Validation (Week 3)
- [ ] Add error handling to ChatView character query
- [ ] Add error handling to CharacterEditorPanel
- [ ] Add error handling to CharactersPanel
- [ ] Add error handling to LorebookPanel
- [ ] Add maxLength to ChatInput
- [ ] Add input validation to GenerationSlider
- [ ] Write all Phase 3 tests

### Phase 4: Edge Cases & Integration (Week 4)
- [ ] Implement greeting navigation tests
- [ ] Implement modal focus trap tests
- [ ] Implement store interaction tests
- [ ] Implement autosave edge case tests
- [ ] Write performance benchmarks

---

## Metrics

| Category | Tests | Coverage Target |
|----------|-------|-----------------|
| Memory Leaks | 4 | 100% of interval/setTimeout patterns |
| Accessibility | 12 | All interactive elements |
| Error States | 8 | All useQuery calls |
| Input Validation | 6 | All text inputs |
| Edge Cases | 10 | Core user flows |
| Integration | 6 | Store interactions |
| Performance | 2 | Critical renders |
| **Total** | **48** | — |

---

## Notes

- Tests use Bun test runner (no Jest/Vitest)
- No mocking library available — use manual mocks or `vi.fn()` equivalents
- Some tests may require `@testing-library/react` — verify dependency availability
- Memory leak tests require `jest.useFakeTimers()` equivalent in Bun
- A11y tests can use `@axe-core/react` for automated checks (optional)
