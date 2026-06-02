import { type ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isDemo } from '@/shared/lib/env';
import { readLastDemoRole } from '@/shared/lib/demoRole';
import { useAuthStore } from '@/shared/store/authStore';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const demo = useAuthStore((s) => s.demo);
  const loading = useAuthStore((s) => s.loading);
  const hydrating = useAuthStore((s) => s.hydrating);
  const enterDemo = useAuthStore((s) => s.enterDemo);

  // In the offline demo build the demo session lives only in memory, so a hard
  // refresh on a deep link (e.g. /app/discutii) drops it. Re-enter the persisted
  // demo persona (T174) in place instead of bouncing to the demo entry point, so
  // the requested route is preserved. Only fires in the demo stage; the live
  // build still redirects unauthenticated users to the login page.
  const needsDemoBootstrap = isDemo() && !loading && !session && !demo;
  useEffect(() => {
    if (needsDemoBootstrap) enterDemo(readLastDemoRole());
  }, [needsDemoBootstrap, enterDemo]);

  // While the session exists but profile/memberships are still loading, hold on
  // the loading state so role-gated UI never renders against empty tenant context.
  if (loading || (session && hydrating) || needsDemoBootstrap) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">{t('common.loading')}</div>
    );
  }
  if (!session && !demo) return <Navigate to="/" replace />;
  return <>{children}</>;
}
