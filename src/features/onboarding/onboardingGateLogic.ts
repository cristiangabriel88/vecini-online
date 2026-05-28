import type { Membership } from '@/shared/types/domain';

/**
 * The placeholder name written by provision-asociatie when a new asociatie is
 * created server-side. The admin fills in the real name during the onboarding
 * wizard. Used as the offline-path signal for "wizard not yet completed".
 */
export const PROVISIONAL_ASOCIATIE_NAME = '(de completat)';

/**
 * Find the first admin membership that is on a provisional (not-yet-configured)
 * asociatie. Returns null when no such membership exists.
 *
 * Offline path: the provisional asociatie has an entry in localAsociatii with
 * name === PROVISIONAL_ASOCIATIE_NAME (set by activateProvisionedAdmin).
 *
 * Live PROD path: the asociatie was created server-side; localAsociatii has no
 * entry for it yet (only populated by createLocalAsociatie once the wizard runs).
 * Any admin membership with no localAsociatii entry is treated as provisional.
 *
 * Pure so it is unit-testable without a backend.
 */
export function findProvisionalAdminMembership(
  memberships: Membership[],
  localAsociatii: { id: string; name: string }[],
): Membership | null {
  const adminMemberships = memberships.filter(
    (m) => m.role === 'admin' && m.ended_at === null,
  );
  for (const m of adminMemberships) {
    const local = localAsociatii.find((a) => a.id === m.asociatie_id);
    if (!local || local.name === PROVISIONAL_ASOCIATIE_NAME) {
      return m;
    }
  }
  return null;
}
