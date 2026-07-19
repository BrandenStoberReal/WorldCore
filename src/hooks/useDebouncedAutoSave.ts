import { useState, useRef, useEffect, useCallback } from 'react';

export type AutoSaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

export interface UseDebouncedAutoSaveOptions<T> {
  value: T;
  save: (value: T) => Promise<void> | void;
  delayMs?: number;
  equals?: (a: T, b: T) => boolean;
  savedDisplayMs?: number;
}

export interface UseDebouncedAutoSaveResult<T> {
  local: T;
  setLocal: (next: T) => void;
  flush: () => Promise<void>;
  cancel: () => void;
  dirty: boolean;
  status: AutoSaveStatus;
  error: Error | null;
  saveNow: (value: T) => Promise<void>;
}

export function useDebouncedAutoSave<T>(
  opts: UseDebouncedAutoSaveOptions<T>,
): UseDebouncedAutoSaveResult<T> {
  const { value, save, delayMs = 600, equals = Object.is, savedDisplayMs = 2000 } = opts;

  // Refs for stable callbacks — never put save/equals/delayMs/savedDisplayMs in any effect dep array.
  const saveRef = useRef(save);
  const equalsRef = useRef(equals);
  const delayMsRef = useRef(delayMs);
  const savedDisplayMsRef = useRef(savedDisplayMs);
  useEffect(() => {
    saveRef.current = save;
    equalsRef.current = equals;
    delayMsRef.current = delayMs;
    savedDisplayMsRef.current = savedDisplayMs;
  });

  // Sequence counter for race guard (prevent stale save from overwriting later save's status).
  const seqRef = useRef(0);

  // Baseline refs for save-loop guard + reseed logic.
  const valueRef = useRef(value);
  const baselineRef = useRef(value);
  const localRef = useRef(value);

  // Mounted guard + timer refs.
  const mountedRef = useRef(true);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedDisplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tracks when a reseed just happened so the debounce effect can distinguish
  // external value changes (query refetch) from user edits.
  const reseededRef = useRef(false);

  // State.
  const [local, setLocalState] = useState<T>(value);
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [error, setError] = useState<Error | null>(null);

  // Derived dirty (computed each render — not state).
  const dirty = !equalsRef.current(local, value);

  // Timer clear helpers (stable, empty deps).
  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);
  const clearSavedDisplayTimer = useCallback(() => {
    if (savedDisplayTimerRef.current !== null) {
      clearTimeout(savedDisplayTimerRef.current);
      savedDisplayTimerRef.current = null;
    }
  }, []);

  // performSave via ref (up-to-date every render, callable from setTimeout).
  const performSaveRef = useRef<(valueToSave: T) => Promise<void>>(() => Promise.resolve());
  performSaveRef.current = (valueToSave: T): Promise<void> => {
    const mySeq = ++seqRef.current;
    setStatus('saving');
    // Wrap in Promise.resolve().then() to catch both async rejections and sync throws.
    return Promise.resolve()
      .then(() => saveRef.current(valueToSave))
      .then(
        () => {
          if (!mountedRef.current || seqRef.current !== mySeq) return;
          setError(null);
          setStatus('saved');
          clearSavedDisplayTimer();
          savedDisplayTimerRef.current = setTimeout(() => {
            if (!mountedRef.current) return;
            savedDisplayTimerRef.current = null;
            // LOOP GUARD: only go idle if local now equals the (possibly-updated) value.
            if (equalsRef.current(localRef.current, valueRef.current)) {
              setStatus('idle');
            }
          }, savedDisplayMsRef.current);
        },
        (err: unknown) => {
          if (!mountedRef.current || seqRef.current !== mySeq) return;
          setError(err instanceof Error ? err : new Error(String(err)));
          setStatus('error');
        },
      );
  };

  // setLocal (stable, empty deps).
  const setLocal = useCallback((next: T) => {
    localRef.current = next;
    setLocalState(next);
  }, []);

  // Reseed effect — MUST be defined BEFORE the debounce trigger effect so valueRef updates first.
  useEffect(() => {
    reseededRef.current = false;
    valueRef.current = value;
    if (equalsRef.current(localRef.current, baselineRef.current)) {
      baselineRef.current = value;
      localRef.current = value;
      setLocalState(value);
      reseededRef.current = true;
    } else {
      baselineRef.current = value;
    }
  }, [value]);

  // Debounce trigger effect (deps: [local, value] ONLY — never save/equals/delayMs/savedDisplayMs).
  useEffect(() => {
    if (reseededRef.current) {
      reseededRef.current = false;
      return;
    }
    if (equalsRef.current(local, valueRef.current)) {
      setStatus((prev) => (prev === 'unsaved' ? 'idle' : prev));
      return;
    }
    setStatus('unsaved');
    clearDebounceTimer();
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void performSaveRef.current(localRef.current);
    }, delayMsRef.current);
    return () => {
      clearDebounceTimer();
    };
  }, [local, value]);

  // Unmount flush effect (empty deps — runs once on mount, cleanup on unmount).
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearDebounceTimer();
      clearSavedDisplayTimer();
      // Fire-and-forget flush save if dirty (may fire once in StrictMode dev double-invoke —
      // harmless since save is idempotent).
      if (!equalsRef.current(localRef.current, valueRef.current)) {
        void saveRef.current(localRef.current);
      }
    };
  }, []);

  // flush (clears timer, fires save immediately if dirty, returns the save promise).
  const flush = useCallback(async (): Promise<void> => {
    clearDebounceTimer();
    if (!equalsRef.current(localRef.current, valueRef.current)) {
      await performSaveRef.current(localRef.current);
    }
  }, [clearDebounceTimer]);

  // cancel (clears timer, resets status to idle if currently unsaved).
  const cancel = useCallback(() => {
    clearDebounceTimer();
    setStatus((prev) => (prev === 'unsaved' ? 'idle' : prev));
  }, [clearDebounceTimer]);

  // saveNow (clears timers, sets local, fires save immediately bypassing debounce).
  const saveNow = useCallback(
    async (valueToSave: T): Promise<void> => {
      clearDebounceTimer();
      clearSavedDisplayTimer();
      localRef.current = valueToSave;
      setLocalState(valueToSave);
      await performSaveRef.current(valueToSave);
    },
    [clearDebounceTimer, clearSavedDisplayTimer],
  );

  return { local, setLocal, flush, cancel, dirty, status, error, saveNow };
}
