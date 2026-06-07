import { useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useThemeStore } from '@/shared/store/themeStore';
import { useTintStore } from '@/shared/store/tintStore';
import { ConsentBanner } from '@/features/legal/ConsentBanner';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { PerfSuggestion } from '@/shared/components/PerfSuggestion';
import { UpdatePrompt } from '@/shared/components/UpdatePrompt';
import { backoffDelay, shouldRetry } from '@/shared/lib/retry';
import '@/shared/lib/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Transient failures (network, 5xx, 408/429) self-heal with exponential
      // backoff; deterministic 4xx and aborted requests fail fast (T07).
      retry: (failureCount, error) => shouldRetry(failureCount, error),
      retryDelay: (attempt) => backoffDelay(attempt),
    },
    mutations: {
      retry: (failureCount, error) => shouldRetry(failureCount, error, 2),
      retryDelay: (attempt) => backoffDelay(attempt),
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  const applyTheme = useThemeStore((s) => s.apply);
  const applyTint = useTintStore((s) => s.apply);
  useEffect(() => {
    applyTheme();
    applyTint();
  }, [applyTheme, applyTint]);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary source="app-shell">{children}</ErrorBoundary>
      <ConsentBanner />
      <PerfSuggestion />
      <UpdatePrompt />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          },
        }}
      />
    </QueryClientProvider>
  );
}
