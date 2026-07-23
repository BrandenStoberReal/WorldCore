import { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { DrawerShell } from '@/components/drawers/DrawerShell';
import { Onboarding } from '@/components/Onboarding';
import { useAppStore } from '@/lib/stores';
import { checkOnboardingStatus } from '@/lib/api';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import '@/index.css';

export function App() {
  const [onboardingNeeded, setOnboardingNeeded] = useState<boolean | null>(null);
  const initUser = useAppStore((s) => s.initUser);
  const initTheme = useAppStore((s) => s.initTheme);
  useKeyboardShortcuts();

  useEffect(() => {
    void checkOnboardingStatus().then((needed) => {
      setOnboardingNeeded(needed);
      if (!needed) {
        void initUser();
        void initTheme();
      }
    });
  }, [initUser, initTheme]);

  if (onboardingNeeded === null) {
    return null;
  }

  if (onboardingNeeded) {
    return (
      <QueryClientProvider client={queryClient}>
        <Onboarding onComplete={() => window.location.reload()} />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <DrawerShell />
    </QueryClientProvider>
  );
}

export default App;
