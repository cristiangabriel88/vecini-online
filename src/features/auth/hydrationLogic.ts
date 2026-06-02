import type { Membership, NotificationPreferences, Role, UserProfile } from '@/shared/types/domain';

/**
 * Pure helpers for turning a freshly-fetched set of memberships into the
 * derived auth state the app reads: which asociație is active, the role there,
 * and whether the signed-in user has no asociație yet (so the onboarding gate
 * can route them). Kept side-effect-free so it is unit-testable without a
 * backend; `authStore` does the fetching and calls these.
 */

/** Privilege ordering — higher wins when choosing a default active asociație. */
const ROLE_RANK: Record<Role, number> = {
  super_admin: 6,
  admin: 5,
  presedinte: 4,
  comitet: 3,
  cenzor: 2,
  proprietar: 1,
  locatar: 0,
};

/** Only memberships that are still in force (not ended). */
export function activeMemberships(memberships: Membership[]): Membership[] {
  return memberships.filter((m) => m.ended_at === null);
}

/**
 * Sort active memberships first, then by descending privilege, then by oldest
 * join date, so `memberships[0]` is a stable, sensible default and existing
 * `memberships[0]?.role` readers pick the most privileged active role.
 */
export function sortByPrivilege(memberships: Membership[]): Membership[] {
  return [...memberships].sort((a, b) => {
    const aActive = a.ended_at === null ? 1 : 0;
    const bActive = b.ended_at === null ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    const rank = ROLE_RANK[b.role] - ROLE_RANK[a.role];
    if (rank !== 0) return rank;
    return a.joined_at.localeCompare(b.joined_at);
  });
}

/**
 * Pick the active asociație. Honours a `preferred` id when the user still has an
 * active membership there; otherwise falls back to the highest-privilege active
 * membership. Returns null when the user has no active membership.
 */
export function pickActiveAsociatieId(
  memberships: Membership[],
  preferred?: string | null,
): string | null {
  const active = activeMemberships(memberships);
  if (preferred && active.some((m) => m.asociatie_id === preferred)) return preferred;
  const sorted = sortByPrivilege(active);
  return sorted[0]?.asociatie_id ?? null;
}

/**
 * Roles allowed into the asociație-administration area (the "Admin" nav group
 * and its pages). Mirrors the per-page guards (`['admin', 'presedinte']`) and
 * adds `super_admin`, whose platform tier still administers any asociație.
 */
export const ADMIN_NAV_ROLES: readonly Role[] = ['super_admin', 'admin', 'presedinte'];

/** True when the role may administer the asociație (so the Admin nav shows). */
export function isAdminRole(role: Role | null): boolean {
  return role !== null && ADMIN_NAV_ROLES.includes(role);
}

/** The user's role in a given asociație (from an active membership), or null. */
export function roleFor(memberships: Membership[], asociatieId: string | null): Role | null {
  if (!asociatieId) return null;
  const inAsociatie = activeMemberships(memberships).filter(
    (m) => m.asociatie_id === asociatieId,
  );
  return sortByPrivilege(inAsociatie)[0]?.role ?? null;
}

/** True when an authenticated user has no active membership in any asociație. */
export function hasNoActiveAsociatie(memberships: Membership[]): boolean {
  return activeMemberships(memberships).length === 0;
}

/** Where a platform superadmin lands inside the app shell (the console home). */
export const SUPERADMIN_HOME_PATH = '/app/platforma';

/**
 * Where a fully-hydrated, authenticated (or demo) session belongs once it reaches
 * the app shell. Kept as a pure decision so the route components stay declarative
 * and the whole matrix is unit-testable without rendering:
 * - `superadmin` — a platform superadmin belongs in the in-app console preview
 *   (demo / single-origin dev when `VITE_PLATFORM_URL` is unset).
 * - `platform-redirect` — a platform superadmin when `platformUrl` is configured:
 *   the resident app must redirect cross-origin to the dedicated console subdomain
 *   so the superadmin never sees the resident shell (T135).
 * - `onboarding` — an ordinary authenticated user with no active membership is
 *   sent to create or join an association.
 * - `app` — an association member reaches the ordinary app.
 *
 * `superadmin` (and `platform-redirect`) win with or without a membership so a
 * superadmin is never sent through association onboarding.
 */
export type AsociatieRoute = 'superadmin' | 'platform-redirect' | 'onboarding' | 'app';

export interface AsociatieRouteInput {
  /** Server-authoritative platform-superadmin status (never a tenant role). */
  isPlatformSuperAdmin: boolean;
  /** Whether the user holds at least one active association membership. */
  hasActiveMembership: boolean;
  /**
   * URL of the dedicated platform console (from `env.platformUrl`). When set
   * and the user is a platform superadmin, the resident app must redirect
   * cross-origin here rather than rendering the in-app preview (T135).
   */
  platformUrl?: string | null;
}

export function resolveAsociatieRoute(input: AsociatieRouteInput): AsociatieRoute {
  if (input.isPlatformSuperAdmin) {
    return input.platformUrl ? 'platform-redirect' : 'superadmin';
  }
  if (!input.hasActiveMembership) return 'onboarding';
  return 'app';
}

/** The slice of auth state derived from the backend reads. */
export interface HydrationState {
  profile: UserProfile | null;
  memberships: Membership[];
  currentAsociatieId: string | null;
}

/** A Supabase-style `{ data, error }` envelope, narrowed to what we read. */
interface QueryResult<T> {
  data: T;
  error: unknown;
}

function normalizeProfile(row: UserProfile): UserProfile {
  return {
    ...row,
    notification_preferences: row.notification_preferences as NotificationPreferences,
  };
}

/**
 * Merge the profile + membership query results into the next derived state,
 * starting from the previous state. Resilient by design:
 * - on a query **error**, the corresponding known-good slice is retained (a
 *   transient network/RLS hiccup must not blank out a signed-in user);
 * - on a **successful** profile read that returns no row, the profile is set to
 *   null (we do not keep a stale profile from a prior user/session);
 * - a successful membership read recomputes the active asociație, honouring the
 *   prior selection when it is still a member.
 * Pure, so the resilience rules are unit-testable without a backend.
 */
export function mergeHydration(
  prev: HydrationState,
  profileRes: QueryResult<unknown>,
  membershipRes: QueryResult<unknown>,
): HydrationState {
  const next: HydrationState = { ...prev };
  if (!profileRes.error) {
    next.profile = profileRes.data ? normalizeProfile(profileRes.data as UserProfile) : null;
  }
  if (!membershipRes.error) {
    const memberships = sortByPrivilege(((membershipRes.data as Membership[] | null) ?? []));
    next.memberships = memberships;
    next.currentAsociatieId = pickActiveAsociatieId(memberships, prev.currentAsociatieId);
  }
  return next;
}
