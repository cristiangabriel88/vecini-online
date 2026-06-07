import type { Apartment } from '@/shared/types/domain';
import type { InviteCode } from '@/features/invites/inviteLogic';
import type { Announcement } from '@/shared/types/domain';
import type { FeatureFlags } from '@/shared/features/featureFlagsLogic';

export type GetStartedKey = 'apartments' | 'invites' | 'announcements' | 'features';

export interface GetStartedStep {
  key: GetStartedKey;
  done: boolean;
  path: string;
}

export interface GetStartedResult {
  steps: GetStartedStep[];
  allDone: boolean;
  doneCount: number;
}

/**
 * Pure computation of the get-started checklist state. Each step detects
 * completion from the current store snapshots so the checklist auto-ticks
 * as the admin completes each action.
 */
export function computeGetStarted(
  apartments: Apartment[],
  invites: InviteCode[],
  announcements: Announcement[],
  flags: FeatureFlags,
): GetStartedResult {
  const steps: GetStartedStep[] = [
    {
      key: 'apartments',
      done: apartments.length > 0,
      path: '/app/admin/apartamente',
    },
    {
      key: 'invites',
      done: invites.length > 0,
      path: '/app/admin/invitatii',
    },
    {
      key: 'announcements',
      done: announcements.length > 0,
      path: '/app/anunturi',
    },
    {
      key: 'features',
      done: Object.keys(flags).length > 0,
      path: '/app/admin/functionalitati',
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  return { steps, allDone: doneCount === steps.length, doneCount };
}

/** Whether to show the checklist to this user+building combination. */
export function shouldShowChecklist(
  allDone: boolean,
  dismissed: boolean,
): boolean {
  return !allDone && !dismissed;
}
