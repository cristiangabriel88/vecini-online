import { useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useThemeStore } from '@/shared/store/themeStore';
import { useTintStore } from '@/shared/store/tintStore';
import { ConsentBanner } from '@/features/legal/ConsentBanner';
import '@/shared/lib/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
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
      {children}
      <ConsentBanner />
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
