import type { Membership, Role } from '@/shared/types/domain';
import { genId } from '@/shared/lib/id';

/** Stable id generator for a locally-created asociație (offline path). */
export function newLocalAsociatieId(): string {
  return `local-asoc-${genId()}`;
}

/**
 * Build the founding membership for someone who creates an asociație: they are
 * its `admin`. Used by the offline create path; the live path mints the same
 * shape server-side. Pure so it is unit-testable.
 */
export function buildFounderMembership(
  userId: string,
  asociatieId: string,
  role: Role = 'admin',
  now: string = new Date().toISOString(),
): Membership {
  return {
    id: `mem-${genId()}`,
    user_id: userId,
    asociatie_id: asociatieId,
    role,
    title: role === 'admin' ? 'Administrator' : null,
    joined_at: now,
    ended_at: null,
  };
}
