import { type ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { isDemo, isDev } from '@/shared/lib/env';
import { useAuthStore } from '@/shared/store/authStore';
import { findProvisionalAdminMembership } from '@/features/onboarding/onboardingGateLogic';

/**
 * Gate that protects the /onboarding route.
 *
 * DEV and DEMO pass through unconditionally so the Pi bootstrap flow and the
 * offline demo experience remain intact.
 *
 * In PROD the user must be an admin on a placeholder asociatie (i.e. a
 * freshly-provisioned invite that has not yet run the wizard). Any other
 * authenticated user is redirected to / with a toast explaining they need a
 * valid invitation. Sits inside RequireAuth so a session exists by this point.
 */
export function RequireOnboardingEntry({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const memberships = useAuthStore((s) => s.memberships);
  const localAsociatii = useAuthStore((s) => s.localAsociatii);

  const skipGate = isDemo() || isDev();
  const hasProvisionalEntry =
    skipGate || findProvisionalAdminMembership(memberships, localAsociatii) !== null;
  const blocked = !hasProvisionalEntry;

  useEffect(() => {
    if (blocked) toast.error(t('auth.noValidInvite'));
  }, [blocked, t]);

  if (blocked) return <Navigate to="/" replace />;
  return <>{children}</>;
}
