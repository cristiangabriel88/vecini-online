import { type ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/shared/store/authStore';
import { hasNoActiveAsociatie, resolveAsociatieRoute } from '@/features/auth/hydrationLogic';
import { env } from '@/shared/lib/env';

/**
 * Gate that distinguishes "authenticated" from "authenticated with an active
 * asociație". A signed-in (or demo) user who belongs to no asociație is routed
 * to onboarding to create one or join by invite code, instead of landing on an
 * empty app. A platform superadmin is the exception: their authority is not a
 * tenant membership, so they are let into the shell (where `AppHome` lands them
 * in the platform console) rather than pushed through association onboarding.
 * When `VITE_PLATFORM_URL` is configured a superadmin is redirected cross-origin
 * to the dedicated console subdomain instead of the in-app preview (T135).
 * Sits inside `RequireAuth`, so by here a session (or demo) exists.
 */
export function RequireAsociatie({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const memberships = useAuthStore((s) => s.memberships);
  const isPlatformSuperAdmin = useAuthStore((s) => s.isPlatformSuperAdmin);
  const hydrating = useAuthStore((s) => s.hydrating);
  const session = useAuthStore((s) => s.session);

  // Compute the route before any early return so hooks stay unconditional.
  const route = resolveAsociatieRoute({
    isPlatformSuperAdmin,
    hasActiveMembership: !hasNoActiveAsociatie(memberships),
    platformUrl: env.platformUrl,
  });

  // Cross-origin redirect: fire as a side effect so no resident content renders.
  useEffect(() => {
    if (route === 'platform-redirect' && env.platformUrl) {
      window.location.href = env.platformUrl;
    }
  }, [route]);

  // Wait for hydration to finish before deciding, so we never bounce a user who
  // does have memberships (or a superadmin status) still being fetched.
  if (session && hydrating) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        {t('common.loading')}
      </div>
    );
  }

  if (route === 'platform-redirect') return null;
  // Only a member-less, non-superadmin user is redirected out to onboarding; the
  // superadmin and ordinary members both render the shell.
  if (route === 'onboarding') return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}
