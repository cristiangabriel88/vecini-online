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
  chirias: 0,
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
