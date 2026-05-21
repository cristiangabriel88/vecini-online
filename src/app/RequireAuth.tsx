import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';

export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useAuthStore((s) => s.session);
  const demo = useAuthStore((s) => s.demo);
  const loading = useAuthStore((s) => s.loading);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">Se încarcă…</div>
    );
  }
  if (!session && !demo) return <Navigate to="/" replace />;
  return <>{children}</>;
}
