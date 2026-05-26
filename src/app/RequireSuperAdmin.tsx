import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';

/**
 * Layout gate for the in-app platform/superadmin area (`/app/platforma/*`). Only
 * a platform superadmin may enter; everyone else is sent to the home page, so the
 * superadmin reaches its own console while admins and residents never see it. The
 * status is the server-authoritative `isPlatformSuperAdmin` flag (`is_super_admin()`
 * live, the demo role offline) — never a tenant membership role, so a superadmin
 * is admitted without an association membership. Sits inside `RequireAuth` +
 * `RequireAsociatie`, so a session already exists here. (The production superadmin
 * tier remains the separate-origin app in `src/platform/*`; this in-app surface is
 * the role-aware preview the demo personas open.)
 */
export function RequireSuperAdmin() {
  const isPlatformSuperAdmin = useAuthStore((s) => s.isPlatformSuperAdmin);
  if (!isPlatformSuperAdmin) return <Navigate to="/app" replace />;
  return <Outlet />;
}
