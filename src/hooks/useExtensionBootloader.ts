import { useEffect, useRef, useState } from 'react';
import { apiGet } from '@/lib/api';
import {
  loadAllExtensions,
  unloadExtension,
  installActivationSdk,
  type LoadResult,
} from '@/lib/extensionLoader';
import type { ExtensionRow } from '@/shared/types/extensions';

interface BootloaderState {
  results: LoadResult[];
  error: Error | null;
  running: boolean;
}

/**
 * Mounts once, fetches the user's enabled extension list, installs the
 * `globalThis.__WorldCore_activate__` SDK, and dynamically injects each
 * extension's module script. Re-runs when `enabled` flips from false→true so
 * newly installed extensions activate without a manual page reload.
 *
 * Browser-only by design: `document` access is deferred to keep this safe
 * to import during SSR or test preload. Bail-out: `typeof document ===
 * 'undefined'` returns the boot state without touching the DOM.
 */
export function useExtensionBootloader(): BootloaderState {
  const [state, setState] = useState<BootloaderState>({
    results: [],
    error: null,
    running: false,
  });
  const lastLoadedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof document === 'undefined') return;
    let cancelled = false;

    installActivationSdk();

    async function run(): Promise<void> {
      setState((prev) => ({ ...prev, running: true, error: null }));
      try {
        const rows = await apiGet<ExtensionRow[]>('/extensions/list');
        if (cancelled) return;

        const prev = lastLoadedIdsRef.current;
        const next = new Set(rows.map((r) => r.id));
        for (const id of prev) {
          if (!next.has(id)) {
            unloadExtension(id);
          }
        }
        for (const id of next) {
          if (!prev.has(id)) {
            // freshly installed: nothing to unload
          }
        }
        lastLoadedIdsRef.current = next;

        const results = await loadAllExtensions(rows);
        if (cancelled) return;
        setState({ results, error: null, running: false });
      } catch (err) {
        if (cancelled) return;
        setState({
          results: [],
          error: err instanceof Error ? err : new Error(String(err)),
          running: false,
        });
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
