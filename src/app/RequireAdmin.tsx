import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import { isAdminRole } from '@/features/auth/hydrationLogic';

/**
 * Layout gate for the asociație-administration routes (`/app/admin/*`). Only
 * management roles (admin / presedinte / super_admin) may enter; a plain
 * locatar is sent back to the home page rather than shown admin tooling. This
 * mirrors the per-page guards and keeps the role-preview honest: each demo
 * persona only reaches the surfaces it would actually have. Sits inside
 * `RequireAuth` + `RequireAsociatie`, so a session and active role exist here.
 */
export function RequireAdmin() {
  const role = useAuthStore((s) => s.activeRole)();
  if (!isAdminRole(role)) return <Navigate to="/app" replace />;
  return <Outlet />;
}
