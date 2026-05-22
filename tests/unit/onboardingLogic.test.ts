import { describe, expect, it } from 'vitest';
import { buildFounderMembership, newLocalAsociatieId } from '@/features/onboarding/onboardingLogic';
import { hasNoActiveAsociatie, roleFor } from '@/features/auth/hydrationLogic';

describe('newLocalAsociatieId', () => {
  it('produces unique, prefixed ids', () => {
    const a = newLocalAsociatieId();
    const b = newLocalAsociatieId();
    expect(a).toMatch(/^local-asoc-/);
    expect(a).not.toBe(b);
  });
});

describe('buildFounderMembership', () => {
  it('makes the founder an active admin of the new asociație', () => {
    const m = buildFounderMembership('user-1', 'asoc-1');
    expect(m.user_id).toBe('user-1');
    expect(m.asociatie_id).toBe('asoc-1');
    expect(m.role).toBe('admin');
    expect(m.title).toBe('Administrator');
    expect(m.ended_at).toBeNull();
  });

  it('yields a membership that satisfies the onboarding gate and resolves the role', () => {
    const m = buildFounderMembership('user-1', 'asoc-1');
    expect(hasNoActiveAsociatie([m])).toBe(false);
    expect(roleFor([m], 'asoc-1')).toBe('admin');
  });

  it('honours a non-default role with no admin title', () => {
    const m = buildFounderMembership('user-1', 'asoc-1', 'presedinte');
    expect(m.role).toBe('presedinte');
    expect(m.title).toBeNull();
  });
});
