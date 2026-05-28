import { describe, expect, it } from 'vitest';
import type { Membership } from '@/shared/types/domain';
import {
  PROVISIONAL_ASOCIATIE_NAME,
  findProvisionalAdminMembership,
} from '@/features/onboarding/onboardingGateLogic';

const NOW = '2024-01-01T00:00:00.000Z';

function mem(over: Partial<Membership> = {}): Membership {
  return {
    id: 'mem-1',
    user_id: 'user-1',
    asociatie_id: 'asoc-1',
    role: 'admin',
    title: null,
    joined_at: NOW,
    ended_at: null,
    ...over,
  };
}

const PLACEHOLDER = PROVISIONAL_ASOCIATIE_NAME;

describe('findProvisionalAdminMembership', () => {
  it('returns null for empty memberships', () => {
    expect(findProvisionalAdminMembership([], [])).toBeNull();
  });

  it('returns null when the only membership is not admin', () => {
    expect(findProvisionalAdminMembership([mem({ role: 'proprietar' })], [])).toBeNull();
  });

  it('returns null when the admin membership has ended', () => {
    expect(findProvisionalAdminMembership([mem({ ended_at: NOW })], [])).toBeNull();
  });

  it('returns the membership when admin has no localAsociatii entry (live PROD path)', () => {
    const m = mem();
    expect(findProvisionalAdminMembership([m], [])).toBe(m);
  });

  it('returns the membership when the localAsociatii entry has the placeholder name (offline provisional)', () => {
    const m = mem();
    const local = [{ id: 'asoc-1', name: PLACEHOLDER }];
    expect(findProvisionalAdminMembership([m], local)).toBe(m);
  });

  it('returns null when the localAsociatii entry has a real name (established admin)', () => {
    const m = mem();
    const local = [{ id: 'asoc-1', name: 'Bloc 5 Sector 3' }];
    expect(findProvisionalAdminMembership([m], local)).toBeNull();
  });

  it('prefers provisional over established when multiple admin memberships exist', () => {
    const established = mem({ id: 'mem-1', asociatie_id: 'asoc-1' });
    const provisional = mem({ id: 'mem-2', asociatie_id: 'asoc-2' });
    const local = [{ id: 'asoc-1', name: 'Bloc Real' }];
    const result = findProvisionalAdminMembership([established, provisional], local);
    expect(result).toBe(provisional);
  });

  it('returns null when all admin memberships are for established asociatii', () => {
    const m1 = mem({ id: 'mem-1', asociatie_id: 'asoc-1' });
    const m2 = mem({ id: 'mem-2', asociatie_id: 'asoc-2' });
    const local = [
      { id: 'asoc-1', name: 'Bloc A' },
      { id: 'asoc-2', name: 'Bloc B' },
    ];
    expect(findProvisionalAdminMembership([m1, m2], local)).toBeNull();
  });

  it('ignores non-admin memberships even when they have no localAsociatii entry', () => {
    const member = mem({ role: 'proprietar' });
    expect(findProvisionalAdminMembership([member], [])).toBeNull();
  });
});
