import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/shared/store/authStore';
import { hasNoActiveAsociatie } from '@/features/auth/hydrationLogic';

/**
 * Gate that distinguishes "authenticated" from "authenticated with an active
 * asociație". A signed-in (or demo) user who belongs to no asociație is routed
 * to onboarding to create one or join by invite code, instead of landing on an
 * empty app. Sits inside `RequireAuth`, so by here a session (or demo) exists.
 */
export function RequireAsociatie({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const memberships = useAuthStore((s) => s.memberships);
  const hydrating = useAuthStore((s) => s.hydrating);
  const session = useAuthStore((s) => s.session);

  // Wait for hydration to finish before deciding, so we never bounce a user who
  // does have memberships still being fetched.
  if (session && hydrating) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        {t('common.loading')}
      </div>
    );
  }
  if (hasNoActiveAsociatie(memberships)) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}
