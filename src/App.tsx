import { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { DrawerShell } from '@/components/drawers/DrawerShell';
import { Onboarding } from '@/components/Onboarding';
import { Toaster } from '@/components/ui/sonner';
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
