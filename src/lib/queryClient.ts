import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toastError } from '@/lib/toast';

interface ToastAwareMeta {
  silenceErrorToast?: boolean;
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (err, query) => {
      const meta = query.meta as ToastAwareMeta | undefined;
      if (meta?.silenceErrorToast) return;
      toastError(err);
    },
  }),
  mutationCache: new MutationCache({
    onError: (err, _variables, _context, mutation) => {
      const meta = mutation.meta as ToastAwareMeta | undefined;
      if (meta?.silenceErrorToast) return;
      toastError(err);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});
