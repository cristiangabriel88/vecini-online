import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import { SUPERADMIN_HOME_PATH } from '@/features/auth/hydrationLogic';
import HomePage from '@/features/home/HomePage';

/**
 * The `/app` index. A platform superadmin lands directly on the in-app superadmin
 * console; admins and residents see the ordinary home. The superadmin status is
 * the server-authoritative `isPlatformSuperAdmin` flag, so the operator is routed
 * to the console without (and never needing) an association membership.
 */
export default function AppHome() {
  const isPlatformSuperAdmin = useAuthStore((s) => s.isPlatformSuperAdmin);
  if (isPlatformSuperAdmin) return <Navigate to={SUPERADMIN_HOME_PATH} replace />;
  return <HomePage />;
}
