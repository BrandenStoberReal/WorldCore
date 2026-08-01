import { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { DrawerShell } from '@/components/drawers/DrawerShell';
import { Onboarding } from '@/components/Onboarding';
import { Toaster } from '@/components/ui/sonner';
import { useAppStore } from '@/lib/stores';
import { apiFetch, checkOnboardingStatus, getSettings } from '@/lib/api';
import { useNavStore } from '@/lib/navStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useExtensionBootloader } from '@/hooks/useExtensionBootloader';
import '@/index.css';

export function App() {
  const [onboardingNeeded, setOnboardingNeeded] = useState<boolean | null>(null);
  const initUser = useAppStore((s) => s.initUser);
  const initSettings = useAppStore((s) => s.initSettings);
  const setConnected = useNavStore((s) => s.setConnected);
  const bootloader = useExtensionBootloader();
  useKeyboardShortcuts();

  useEffect(() => {
    async function boot(): Promise<void> {
      const needed = await checkOnboardingStatus();
      setOnboardingNeeded(needed);
      if (needed) return;

      await initUser();
      await initSettings();

      // Auto-connect on load — only when the user previously opted in via the
      // ConnectionsPanel "Auto-connect to Last Server" checkbox. The flag is
      // persisted to localStorage key `worldcore/connection` by useConnection.
      let autoConnect = false;
      try {
        const raw = localStorage.getItem('worldcore/connection');
        if (raw) {
          const parsed = JSON.parse(raw) as { autoConnect?: unknown };
          if (typeof parsed.autoConnect === 'boolean') autoConnect = parsed.autoConnect;
        }
      } catch {
        /* ignore malformed storage */
      }
      if (!autoConnect) return;

      try {
        const settings = await getSettings<Record<string, unknown>>();
        const source =
          typeof settings?.chat_completion_source === 'string'
            ? settings.chat_completion_source
            : null;
        const url = typeof settings?.reverse_proxy === 'string' ? settings.reverse_proxy : '';
        if (!source) return;

        const qs = url ? `?url=${encodeURIComponent(url)}` : '';
        await apiFetch(`/models/${source}${qs}`);
        setConnected(true);
      } catch {
        setConnected(false);
      }
    }
    void boot();
  }, [initUser, initSettings, setConnected]);

  if (bootloader.error && typeof console !== 'undefined') {
    console.warn('[worldcore-ext] boot error:', bootloader.error.message);
  }

  let content: React.ReactNode = null;
  if (onboardingNeeded === true) {
    content = <Onboarding onComplete={() => window.location.reload()} />;
  } else if (onboardingNeeded === false) {
    content = <DrawerShell />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {content}
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
