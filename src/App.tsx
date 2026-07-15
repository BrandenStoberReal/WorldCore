import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { DrawerShell } from '@/components/drawers/DrawerShell';
import '@/index.css';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DrawerShell />
    </QueryClientProvider>
  );
}

export default App;
