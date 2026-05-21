import { describe, expect, it } from 'vitest';
import { isAssigned, isMine, isValidTask, openTaskCount, sortTasks } from '@/features/greenspace/greenLogic';
import type { GreenTask } from '@/shared/types/domain';

const base = { asociatie_id: 'a' };

const tasks: GreenTask[] = [
  { ...base, id: '1', title: 'Udat', week_start: '2026-05-18', volunteer_user_id: 'u1', volunteer_name: 'Ana' },
  { ...base, id: '2', title: 'Tuns gazon', week_start: '2026-05-04', volunteer_user_id: null, volunteer_name: null },
  { ...base, id: '3', title: 'Curățat alee', week_start: '2026-05-11', volunteer_user_id: null, volunteer_name: null },
];

describe('isValidTask', () => {
  it('requires a title and a week', () => {
    expect(isValidTask('Udat', '2026-05-01')).toBe(true);
    expect(isValidTask(' ', '2026-05-01')).toBe(false);
    expect(isValidTask('Udat', '')).toBe(false);
  });
});

describe('sortTasks', () => {
  it('orders soonest week first', () => {
    expect(sortTasks(tasks).map((t) => t.id)).toEqual(['2', '3', '1']);
  });
});

describe('isAssigned / openTaskCount', () => {
  it('reflects assignment', () => {
    expect(isAssigned(tasks[0])).toBe(true);
    expect(isAssigned(tasks[1])).toBe(false);
    expect(openTaskCount(tasks)).toBe(2);
  });
});

describe('isMine', () => {
  it('matches the volunteer', () => {
    expect(isMine(tasks[0], 'u1')).toBe(true);
    expect(isMine(tasks[0], 'u2')).toBe(false);
  });
});
