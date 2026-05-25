import { describe, expect, it } from 'vitest';
import {
  activeMemberships,
  hasNoActiveAsociatie,
  isAdminRole,
  mergeHydration,
  pickActiveAsociatieId,
  roleFor,
  sortByPrivilege,
  type HydrationState,
} from '@/features/auth/hydrationLogic';
import type { Membership, Role, UserProfile } from '@/shared/types/domain';

function profile(over: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'u1',
    email: 'ana@vecini.ro',
    full_name: 'Ana Pop',
    phone: null,
    avatar_url: null,
    locale: 'ro',
    notification_preferences: {
      channels: ['inapp'],
      quiet_hours: { start: '22:00', end: '07:00' },
    },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...over,
  };
}

function membership(over: Partial<Membership>): Membership {
  return {
    id: over.id ?? `m-${Math.random().toString(36).slice(2)}`,
    user_id: 'u1',
    asociatie_id: over.asociatie_id ?? 'a1',
    role: over.role ?? 'proprietar',
    title: over.title ?? null,
    joined_at: over.joined_at ?? '2026-01-01T00:00:00Z',
    ended_at: over.ended_at ?? null,
    ...over,
  };
}

describe('isAdminRole', () => {
  it('admits the management roles into the admin area', () => {
    for (const role of ['super_admin', 'admin', 'presedinte'] as const) {
      expect(isAdminRole(role)).toBe(true);
    }
  });

  it('keeps a plain locatar and committee/auditor roles out of the admin area', () => {
    for (const role of ['comitet', 'cenzor', 'proprietar', 'chirias'] as const) {
      expect(isAdminRole(role)).toBe(false);
    }
  });

  it('treats a missing role as non-admin', () => {
    expect(isAdminRole(null)).toBe(false);
  });
});

describe('activeMemberships', () => {
  it('drops ended memberships', () => {
    const list = [
      membership({ id: 'a', ended_at: null }),
      membership({ id: 'b', ended_at: '2026-03-01T00:00:00Z' }),
    ];
    expect(activeMemberships(list).map((m) => m.id)).toEqual(['a']);
  });
});

describe('sortByPrivilege', () => {
  it('orders active before ended, then by descending role privilege', () => {
    const list = [
      membership({ id: 'owner', role: 'proprietar' }),
      membership({ id: 'ended-admin', role: 'admin', ended_at: '2026-02-01T00:00:00Z' }),
      membership({ id: 'admin', role: 'admin' }),
    ];
    expect(sortByPrivilege(list).map((m) => m.id)).toEqual(['admin', 'owner', 'ended-admin']);
  });

  it('breaks role ties by oldest join date', () => {
    const list = [
      membership({ id: 'newer', role: 'comitet', joined_at: '2026-05-01T00:00:00Z' }),
      membership({ id: 'older', role: 'comitet', joined_at: '2026-01-01T00:00:00Z' }),
    ];
    expect(sortByPrivilege(list).map((m) => m.id)).toEqual(['older', 'newer']);
  });

  it('does not mutate the input array', () => {
    const list = [membership({ id: 'a' }), membership({ id: 'b' })];
    const before = list.map((m) => m.id);
    sortByPrivilege(list);
    expect(list.map((m) => m.id)).toEqual(before);
  });
});

describe('pickActiveAsociatieId', () => {
  it('honours a preferred id when still an active membership', () => {
    const list = [
      membership({ asociatie_id: 'a1', role: 'proprietar' }),
      membership({ asociatie_id: 'a2', role: 'admin' }),
    ];
    expect(pickActiveAsociatieId(list, 'a1')).toBe('a1');
  });

  it('ignores a preferred id the user is no longer active in', () => {
    const list = [
      membership({ asociatie_id: 'a1', role: 'proprietar', ended_at: '2026-02-01T00:00:00Z' }),
      membership({ asociatie_id: 'a2', role: 'admin' }),
    ];
    expect(pickActiveAsociatieId(list, 'a1')).toBe('a2');
  });

  it('falls back to the most privileged active membership', () => {
    const list = [
      membership({ asociatie_id: 'a1', role: 'proprietar' }),
      membership({ asociatie_id: 'a2', role: 'presedinte' }),
    ];
    expect(pickActiveAsociatieId(list)).toBe('a2');
  });

  it('returns null when there is no active membership', () => {
    const list = [membership({ asociatie_id: 'a1', ended_at: '2026-02-01T00:00:00Z' })];
    expect(pickActiveAsociatieId(list)).toBeNull();
    expect(pickActiveAsociatieId([])).toBeNull();
  });
});

describe('roleFor', () => {
  it('returns the most privileged active role in the given asociație', () => {
    const list = [
      membership({ asociatie_id: 'a1', role: 'proprietar' }),
      membership({ asociatie_id: 'a1', role: 'comitet' }),
      membership({ asociatie_id: 'a2', role: 'admin' }),
    ];
    expect(roleFor(list, 'a1')).toBe<Role>('comitet');
  });

  it('returns null for an unknown or null asociație', () => {
    const list = [membership({ asociatie_id: 'a1', role: 'admin' })];
    expect(roleFor(list, 'other')).toBeNull();
    expect(roleFor(list, null)).toBeNull();
  });
});

describe('hasNoActiveAsociatie', () => {
  it('is true with no memberships or only ended ones', () => {
    expect(hasNoActiveAsociatie([])).toBe(true);
    expect(
      hasNoActiveAsociatie([membership({ ended_at: '2026-02-01T00:00:00Z' })]),
    ).toBe(true);
  });

  it('is false with at least one active membership', () => {
    expect(hasNoActiveAsociatie([membership({})])).toBe(false);
  });
});

describe('mergeHydration', () => {
  const knownGood: HydrationState = {
    profile: profile(),
    memberships: [membership({ id: 'm1', asociatie_id: 'a1', role: 'admin' })],
    currentAsociatieId: 'a1',
  };

  it('applies fresh profile + memberships on successful reads', () => {
    const next = mergeHydration(
      { profile: null, memberships: [], currentAsociatieId: null },
      { data: profile({ full_name: 'Ion' }), error: null },
      { data: [membership({ asociatie_id: 'a2', role: 'comitet' })], error: null },
    );
    expect(next.profile?.full_name).toBe('Ion');
    expect(next.memberships).toHaveLength(1);
    expect(next.currentAsociatieId).toBe('a2');
  });

  it('does NOT retain a stale profile when the read succeeds with no row', () => {
    const next = mergeHydration(
      knownGood,
      { data: null, error: null },
      { data: [membership({ asociatie_id: 'a1', role: 'admin' })], error: null },
    );
    expect(next.profile).toBeNull();
  });

  it('retains known-good profile when the profile read errors', () => {
    const next = mergeHydration(
      knownGood,
      { data: null, error: { message: 'network' } },
      { data: [membership({ asociatie_id: 'a1', role: 'admin' })], error: null },
    );
    expect(next.profile).toBe(knownGood.profile);
  });

  it('retains known-good memberships + active asociație when the membership read errors', () => {
    const next = mergeHydration(
      knownGood,
      { data: profile(), error: null },
      { data: null, error: { message: 'timeout' } },
    );
    expect(next.memberships).toBe(knownGood.memberships);
    expect(next.currentAsociatieId).toBe('a1');
  });

  it('leaves state untouched when both reads error', () => {
    const next = mergeHydration(
      knownGood,
      { data: null, error: { message: 'x' } },
      { data: null, error: { message: 'y' } },
    );
    expect(next).toEqual(knownGood);
  });

  it('honours the prior active asociație when still a member after refresh', () => {
    const next = mergeHydration(
      knownGood,
      { data: profile(), error: null },
      {
        data: [
          membership({ asociatie_id: 'a3', role: 'presedinte' }),
          membership({ asociatie_id: 'a1', role: 'admin' }),
        ],
        error: null,
      },
    );
    expect(next.currentAsociatieId).toBe('a1');
  });
});
