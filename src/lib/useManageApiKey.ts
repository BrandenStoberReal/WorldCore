import { useEffect, useRef, useState } from 'react';
import { readSecret, writeSecret } from '@/lib/api';

/**
 * Manage an API key backed by the secrets endpoints.
 *
 * Loads the current value for `api_key_${source}` on mount, exposes a local
 * setter, and `save()` persists via `writeSecret`. `saved` flips to true for
 * ~1.5s after a successful write so callers can flash a success indicator.
 */
export function useManageApiKey(source: string): {
  apiKey: string;
  setApiKey: (v: string) => void;
  save: () => Promise<void>;
  loading: boolean;
  saved: boolean;
} {
  const key = `api_key_${source}`;
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    readSecret(key)
      .then((value) => {
        if (!cancelled) setApiKey(value ?? '');
      })
      .catch(() => {
        // Swallow read errors — empty key is a valid starting state.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  const save = async (): Promise<void> => {
    await writeSecret(key, apiKey, `${source} API key`);
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1500);
  };

  return { apiKey, setApiKey, save, loading, saved };
}
