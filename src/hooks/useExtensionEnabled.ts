import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { ExtensionRow } from '@/shared/types/extensions';

export function useExtensionEnabled(extId: string): boolean {
  const { data } = useQuery<ExtensionRow[]>({
    queryKey: ['/api/v1/extensions/list'],
    queryFn: () => apiGet<ExtensionRow[]>('/extensions/list'),
    staleTime: 30_000,
  });

  if (!data) return false;
  const ext = data.find((e) => e.id === extId);
  return ext?.enabled ?? false;
}
