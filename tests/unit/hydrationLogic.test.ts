import { describe, expect, it } from 'vitest';
import {
  activeMemberships,
  hasNoActiveAsociatie,
  pickActiveAsociatieId,
  roleFor,
  sortByPrivilege,
} from '@/features/auth/hydrationLogic';
import type { Membership, Role } from '@/shared/types/domain';

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
