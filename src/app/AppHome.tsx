import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import HomePage from '@/features/home/HomePage';

/**
 * The `/app` index. A platform `super_admin` lands on the in-app superadmin
 * console; admins and residents see the ordinary home. This keeps each demo
 * persona on the home its role would actually open.
 */
export default function AppHome() {
  const role = useAuthStore((s) => s.activeRole)();
  if (role === 'super_admin') return <Navigate to="/app/platforma" replace />;
  return <HomePage />;
}
