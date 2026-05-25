import { describe, expect, it } from 'vitest';
import {
  DEMO_MEMBERSHIP,
  demoMembershipForRole,
  demoTenantContext,
} from '@/features/auth/demoTenant';
import { DEMO_ASOCIATIE, DEMO_CURRENT_USER_ID } from '@/shared/demo/demoData';
import { hasNoActiveAsociatie, roleFor } from '@/features/auth/hydrationLogic';

describe('demoTenantContext', () => {
  it('selects the demo asociație as active', () => {
    expect(demoTenantContext().currentAsociatieId).toBe(DEMO_ASOCIATIE.id);
  });

  it('seeds a single active membership for the demo user', () => {
    const { memberships } = demoTenantContext();
    expect(memberships).toHaveLength(1);
    expect(memberships[0].user_id).toBe(DEMO_CURRENT_USER_ID);
    expect(memberships[0].asociatie_id).toBe(DEMO_ASOCIATIE.id);
    expect(memberships[0].ended_at).toBeNull();
  });

  it('grants the demo user an admin role so the admin half of the loop works', () => {
    const { currentAsociatieId, memberships } = demoTenantContext();
    expect(roleFor(memberships, currentAsociatieId)).toBe('admin');
  });

  it('produces a context that is NOT member-less (so the onboarding gate passes)', () => {
    expect(hasNoActiveAsociatie(demoTenantContext().memberships)).toBe(false);
  });

  it('exposes the seeded membership constant consistently', () => {
    expect(demoTenantContext().memberships[0]).toEqual(DEMO_MEMBERSHIP);
  });

  it('previews any requested role so the login screen can switch personas', () => {
    for (const role of ['admin', 'super_admin', 'proprietar'] as const) {
      const { currentAsociatieId, memberships } = demoTenantContext(role);
      expect(memberships).toHaveLength(1);
      expect(memberships[0].user_id).toBe(DEMO_CURRENT_USER_ID);
      expect(roleFor(memberships, currentAsociatieId)).toBe(role);
      expect(hasNoActiveAsociatie(memberships)).toBe(false);
    }
  });

  it('builds a membership carrying a display title for the given role', () => {
    const locatar = demoMembershipForRole('proprietar');
    expect(locatar.role).toBe('proprietar');
    expect(locatar.title).toBeTruthy();
  });
});
