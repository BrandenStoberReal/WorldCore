import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { DrawerShell } from '@/components/drawers/DrawerShell';
import { useAppStore } from '@/lib/stores';
import '@/index.css';

export function App() {
  const initUser = useAppStore((s) => s.initUser);
  const initTheme = useAppStore((s) => s.initTheme);

  useEffect(() => {
    void initUser();
    void initTheme();
  }, [initUser, initTheme]);

  return (
    <QueryClientProvider client={queryClient}>
      <DrawerShell />
    </QueryClientProvider>
  );
}

export default App;
