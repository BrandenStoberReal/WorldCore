import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

interface ExtensionRow {
  id: string;
  enabled: boolean;
}

export function useExtensionEnabled(extId: string): boolean {
  const { data } = useQuery({
    queryKey: ['extensions', 'list'],
    queryFn: () => apiGet<ExtensionRow[]>('/extensions/list'),
    staleTime: 30_000,
  });

  if (!data) return false;
  const ext = data.find((e) => e.id === extId);
  return ext?.enabled ?? false;
}
