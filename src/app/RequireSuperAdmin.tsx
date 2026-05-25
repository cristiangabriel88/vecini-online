import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';

/**
 * Layout gate for the in-app platform/superadmin area (`/app/platforma/*`). Only
 * a platform `super_admin` may enter; everyone else is sent to the home page, so
 * the superadmin demo persona reaches its own console while admins and residents
 * never see it. Sits inside `RequireAuth` + `RequireAsociatie`, so a session and
 * active role already exist here. (The production superadmin tier remains the
 * separate-origin app in `src/platform/*`; this in-app surface is the role-aware
 * preview the demo personas open.)
 */
export function RequireSuperAdmin() {
  const role = useAuthStore((s) => s.activeRole)();
  if (role !== 'super_admin') return <Navigate to="/app" replace />;
  return <Outlet />;
}
