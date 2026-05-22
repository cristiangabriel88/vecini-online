import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/shared/store/authStore';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const demo = useAuthStore((s) => s.demo);
  const loading = useAuthStore((s) => s.loading);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">{t('common.loading')}</div>
    );
  }
  if (!session && !demo) return <Navigate to="/" replace />;
  return <>{children}</>;
}
