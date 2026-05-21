import { describe, expect, it } from 'vitest';
import { currentDuty, isCovered, isMine, nextDuty, sortDuty } from '@/features/duty/dutyLogic';
import type { DutySlot } from '@/shared/types/domain';

const base = { asociatie_id: 'a', note: null };

const slots: DutySlot[] = [
  { ...base, id: '1', week_start: '2026-05-23', volunteer_user_id: 'u1', volunteer_name: 'Ana' },
  { ...base, id: '2', week_start: '2026-05-09', volunteer_user_id: null, volunteer_name: null },
  { ...base, id: '3', week_start: '2026-05-16', volunteer_user_id: 'u2', volunteer_name: 'Ion' },
];

describe('sortDuty', () => {
  it('orders soonest weekend first', () => {
    expect(sortDuty(slots).map((s) => s.id)).toEqual(['2', '3', '1']);
  });
});

describe('isCovered', () => {
  it('is true only when a volunteer is assigned', () => {
    expect(isCovered(slots[0])).toBe(true);
    expect(isCovered(slots[1])).toBe(false);
  });
});

describe('currentDuty', () => {
  it('finds the slot covering Saturday or Sunday', () => {
    expect(currentDuty(slots, '2026-05-23T12:00:00Z')?.id).toBe('1');
    expect(currentDuty(slots, '2026-05-24T20:00:00Z')?.id).toBe('1');
  });
  it('returns null on a weekday between slots', () => {
    expect(currentDuty(slots, '2026-05-20T12:00:00Z')).toBeNull();
  });
});

describe('nextDuty', () => {
  it('finds the earliest future slot', () => {
    expect(nextDuty(slots, '2026-05-10T00:00:00Z')?.id).toBe('3');
  });
});

describe('isMine', () => {
  it('matches the volunteer user', () => {
    expect(isMine(slots[2], 'u2')).toBe(true);
    expect(isMine(slots[2], 'u1')).toBe(false);
  });
});
