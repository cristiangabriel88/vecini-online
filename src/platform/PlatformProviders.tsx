import { useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useThemeStore } from '@/shared/store/themeStore';
import { useTintStore } from '@/shared/store/tintStore';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { backoffDelay, shouldRetry } from '@/shared/lib/retry';
import '@/shared/lib/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => shouldRetry(failureCount, error),
      retryDelay: (attempt) => backoffDelay(attempt),
    },
    mutations: {
      retry: (failureCount, error) => shouldRetry(failureCount, error, 2),
      retryDelay: (attempt) => backoffDelay(attempt),
    },
  },
});

/**
 * Providers for the platform (superadmin) app. Mirrors the resident app's
 * providers (query client + theme/tint + toaster + i18n + error boundary) but
 * deliberately omits the resident-only consent banner, since the platform app is
 * an operator tool on its own origin.
 */
export function PlatformProviders({ children }: { children: ReactNode }) {
  const applyTheme = useThemeStore((s) => s.apply);
  const applyTint = useTintStore((s) => s.apply);
  useEffect(() => {
    applyTheme();
    applyTint();
  }, [applyTheme, applyTint]);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary source="platform-shell">{children}</ErrorBoundary>
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
