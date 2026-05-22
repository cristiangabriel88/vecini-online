import type { Membership } from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_CURRENT_USER_ID } from '@/shared/demo/demoData';

/**
 * Offline tenant context for demo mode. Demo entry has no backend to hydrate
 * from, so the app needs a real active asociație + role to scope by and to
 * exercise the admin side of the MVP loop (publish, invite, toggle features).
 * The demo user is seeded as `admin` of `DEMO_ASOCIATIE` so a single offline
 * session can drive both the admin and resident halves of the loop.
 */
export const DEMO_MEMBERSHIP: Membership = {
  id: 'mem-demo',
  user_id: DEMO_CURRENT_USER_ID,
  asociatie_id: DEMO_ASOCIATIE.id,
  role: 'admin',
  title: 'Administrator',
  joined_at: DEMO_ASOCIATIE.created_at,
  ended_at: null,
};

export interface TenantContext {
  currentAsociatieId: string | null;
  memberships: Membership[];
}

/** The seeded local tenant context applied when entering demo mode. */
export function demoTenantContext(): TenantContext {
  return {
    currentAsociatieId: DEMO_ASOCIATIE.id,
    memberships: [DEMO_MEMBERSHIP],
  };
}
