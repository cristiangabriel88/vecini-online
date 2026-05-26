import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import { useMyIdentity } from '@/features/profile/profileStore';
import { useWelcomeStore } from '@/features/welcome/welcomeStore';
import { shouldShowWelcome } from '@/features/welcome/welcomeLogic';

/**
 * Gate that sends a first-time resident through the welcome flow (intro carousel
 * + profile capture) before they reach the app shell. Sits inside
 * `RequireAsociatie`, so by here the user is authenticated and holds an active
 * association membership. Only ordinary residents who have not yet completed the
 * flow are redirected; admins and platform superadmins always pass through (see
 * `shouldShowWelcome`).
 */
export function RequireWelcome({ children }: { children: ReactNode }) {
  const activeRole = useAuthStore((s) => s.activeRole);
  const isPlatformSuperAdmin = useAuthStore((s) => s.isPlatformSuperAdmin);
  const { userId } = useMyIdentity();
  const seen = useWelcomeStore((s) => s.hasSeen(userId));

  if (shouldShowWelcome({ role: activeRole(), isPlatformSuperAdmin, seen })) {
    return <Navigate to="/bun-venit" replace />;
  }
  return <>{children}</>;
}
