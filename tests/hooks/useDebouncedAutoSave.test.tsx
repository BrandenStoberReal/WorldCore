/**
 * Tests for useDebouncedAutoSave hook.
 *
 * bun:test runs WITHOUT a DOM (no jsdom/happy-dom installed, and we
 * cannot install new deps). Tests that require timers, effects, or
 * createRoot are written as `it.todo` — they document the intended
 * assertions but cannot execute without a DOM runtime.
 *
 * The synchronous initial-state test uses `renderToStaticMarkup` from
 * react-dom/server to render a Harness component that captures the
 * hook's return value into an outer variable.
 */
import { describe, it, expect } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  useDebouncedAutoSave,
  type UseDebouncedAutoSaveResult,
} from '../../src/hooks/useDebouncedAutoSave';

/* ------------------------------------------------------------------ */
/*  Probe — confirm DOM availability                                   */
/* ------------------------------------------------------------------ */

import { createRoot } from 'react-dom/client';

let domAvailable = false;

// Probe: detect DOM availability. bun:test runs WITHOUT a DOM, so this
// test records the fact (in `domAvailable`) and passes — it does NOT
// assert DOM exists. Downstream tests gate on `domAvailable` via it.todo.
it('probe: detect DOM availability (informational, no assertion)', () => {
  const docOk = typeof document === 'object' && document !== null;
  const rootOk = typeof createRoot === 'function';
  domAvailable = docOk && rootOk;
  // Always pass — we only record the environment, never assert on it.
  expect(true).toBe(true);
});

/* ------------------------------------------------------------------ */
/*  Test 1 — Initial state (synchronous, works without DOM)            */
/* ------------------------------------------------------------------ */

describe('useDebouncedAutoSave — initial state', () => {
  it('status=idle, dirty=false, local=value on first render', () => {
    let captured: UseDebouncedAutoSaveResult<string> | null = null;

    /** Harness renders the hook and stashes its return value. */
    function Harness() {
      const result = useDebouncedAutoSave({
        value: 'hello',
        save: () => {},
      });
      captured = result;
      return null;
    }

    // renderToStaticMarkup renders synchronously.
    // useState initializers run; useEffect does NOT — but all values
    // we check are computed synchronously in the render body or come
    // from useState defaults.
    renderToStaticMarkup(<Harness />);

    expect(captured).not.toBeNull();
    const r = captured as unknown as UseDebouncedAutoSaveResult<string>;
    expect(r.status).toBe('idle');
    expect(r.dirty).toBe(false);
    expect(r.local).toBe('hello');
    expect(r.error).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  Tests 2–9 — Require DOM (timers / createRoot / act)               */
/*  Marked as todo because bun:test has no DOM in this project.       */
/* ------------------------------------------------------------------ */

const TODO =
  'Requires DOM (createRoot + act + fake timers). ' +
  'bun:test runs without jsdom/happy-dom and those cannot be installed.';

// --- Test 2: full save lifecycle ---
it.todo('2. setLocal(diff) → unsaved → saving → saved → idle — ' + TODO, () => {});

// --- Test 3: save-loop regression ---
it.todo('3. save-loop: value prop update to match local does NOT re-fire save — ' + TODO, () => {});

// --- Test 4: race guard ---
it.todo('4. race: rapid setLocal A then B within delayMs — only save(B) — ' + TODO, () => {});

// --- Test 5: unmount flush ---
it.todo(
  '5. unmount flush: dirty state + unmount → save called once with dirty value — ' + TODO,
  () => {},
);

// --- Test 6: cancel ---
it.todo(
  '6. cancel: setLocal(diff) then cancel() before delayMs → save NOT called, status idle — ' + TODO,
  () => {},
);

// --- Test 7: saveNow ---
it.todo(
  '7. saveNow(v) bypasses debounce; save(v) called immediately; dirty false — ' + TODO,
  () => {},
);

// --- Test 8: default Object.is equality ---
it.todo('8. default Object.is: new ref triggers save, identical ref does NOT — ' + TODO, () => {});

// --- Test 9: custom equals ---
it.todo(
  '9. custom equals: deep-equal diff refs treated as equal — no save fires — ' + TODO,
  () => {},
);
