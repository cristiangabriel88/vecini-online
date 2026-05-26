import type { Role } from '@/shared/types/domain';
import { isAdminRole } from '@/features/auth/hydrationLogic';

/**
 * First-login welcome flow gating, kept pure so the decision matrix is
 * unit-tested without rendering.
 *
 * The welcome flow (intro carousel + profile capture) is for ordinary residents
 * only. Admins already have their own association-setup wizard, and a platform
 * superadmin is not an association member at all (their authority is the
 * server-authoritative `is_super_admin()` flag), so neither sees this.
 */

/**
 * True for resident-tier roles that should see the welcome flow: an ordinary
 * member who joined an existing association rather than administering it.
 * Mirrors `isAdminRole` (admin / presedinte) as the complement, with the
 * platform superadmin excluded separately.
 */
export function isWelcomeEligibleRole(role: Role | null): boolean {
  if (role === null) return false;
  return !isAdminRole(role);
}

export interface ShouldShowWelcomeInput {
  /** The user's role in the active association, or null when none is resolved. */
  role: Role | null;
  /** Server-authoritative platform-superadmin status (never a tenant role). */
  isPlatformSuperAdmin: boolean;
  /** Whether this user has already completed (or skipped) the welcome flow. */
  seen: boolean;
}

/**
 * Whether to route an authenticated, association-holding user into the welcome
 * flow. Only a resident-tier member who has not yet seen it qualifies; a
 * superadmin or admin never does, and nobody sees it twice.
 */
export function shouldShowWelcome({
  role,
  isPlatformSuperAdmin,
  seen,
}: ShouldShowWelcomeInput): boolean {
  if (isPlatformSuperAdmin) return false;
  if (seen) return false;
  return isWelcomeEligibleRole(role);
}
