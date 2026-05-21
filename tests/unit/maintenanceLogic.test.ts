import { describe, expect, it } from 'vitest';
import {
  countDue,
  isValidMaintenance,
  maintenanceStatus,
  sortByNextDue,
} from '@/features/maintenance/maintenanceLogic';
import type { ScheduledMaintenance } from '@/shared/types/domain';

const NOW = new Date('2026-05-22T09:00:00Z');
const base = { asociatie_id: 'a', vendor: null, recurrence: 'Anual', last_done: null, notes: null };

const items: ScheduledMaintenance[] = [
  { ...base, id: 'overdue', title: 'Revizie', next_due: '2026-05-10' },
  { ...base, id: 'soon', title: 'Lift', next_due: '2026-05-30' },
  { ...base, id: 'far', title: 'Deratizare', next_due: '2026-09-01' },
];

describe('maintenanceStatus', () => {
  it('classifies overdue, due-soon and scheduled', () => {
    expect(maintenanceStatus('2026-05-10', NOW)).toBe('overdue');
    expect(maintenanceStatus('2026-05-30', NOW)).toBe('due_soon');
    expect(maintenanceStatus('2026-05-22', NOW)).toBe('due_soon');
    expect(maintenanceStatus('2026-09-01', NOW)).toBe('scheduled');
  });
});

describe('isValidMaintenance', () => {
  it('requires a title of 3+ chars and a parseable date', () => {
    expect(isValidMaintenance('Revizie', '2026-06-01')).toBe(true);
    expect(isValidMaintenance('ab', '2026-06-01')).toBe(false);
    expect(isValidMaintenance('Revizie', 'nope')).toBe(false);
  });
});

describe('sortByNextDue / countDue', () => {
  it('sorts soonest first', () => {
    expect(sortByNextDue(items).map((m) => m.id)).toEqual(['overdue', 'soon', 'far']);
  });

  it('counts overdue + due-soon entries', () => {
    expect(countDue(items, NOW)).toBe(2);
  });
});
