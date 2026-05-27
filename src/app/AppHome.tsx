import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import { SUPERADMIN_HOME_PATH } from '@/features/auth/hydrationLogic';
import { env } from '@/shared/lib/env';
import HomePage from '@/features/home/HomePage';

/**
 * The `/app` index. A platform superadmin is redirected cross-origin to the
 * dedicated console (when `VITE_PLATFORM_URL` is set) or to the in-app preview
 * (single-origin dev/demo). Admins and residents see the ordinary home. The
 * superadmin status is the server-authoritative `isPlatformSuperAdmin` flag, so
 * the operator is routed without needing a membership (T135).
 */
export default function AppHome() {
  const isPlatformSuperAdmin = useAuthStore((s) => s.isPlatformSuperAdmin);

  useEffect(() => {
    if (isPlatformSuperAdmin && env.platformUrl) {
      window.location.href = env.platformUrl;
    }
  }, [isPlatformSuperAdmin]);

  if (isPlatformSuperAdmin) {
    if (env.platformUrl) return null;
    return <Navigate to={SUPERADMIN_HOME_PATH} replace />;
  }
  return <HomePage />;
}
