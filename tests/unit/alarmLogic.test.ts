import { describe, expect, it } from 'vitest';
import {
  attentionCount,
  daysSinceTest,
  isValidSystem,
  needsAttention,
  sortSystems,
  statusTone,
} from '@/features/alarm/alarmLogic';
import type { AlarmSystem } from '@/shared/types/domain';

const TODAY = '2026-05-22T00:00:00Z';
const base = { asociatie_id: 'a', events: [] };

const systems: AlarmSystem[] = [
  { ...base, id: '1', name: 'Detecție subsol', status: 'ok', last_test: '2026-05-02' },
  { ...base, id: '2', name: 'Sirenă scară', status: 'defect', last_test: '2026-05-01' },
  { ...base, id: '3', name: 'Zonă A', status: 'ok', last_test: '2026-01-01' },
];

describe('isValidSystem', () => {
  it('requires a name', () => {
    expect(isValidSystem('Detecție')).toBe(true);
    expect(isValidSystem('  ')).toBe(false);
  });
});

describe('statusTone', () => {
  it('maps statuses to tones', () => {
    expect(statusTone('ok')).toBe('success');
    expect(statusTone('alarma')).toBe('danger');
    expect(statusTone('defect')).toBe('warning');
    expect(statusTone('test')).toBe('primary');
  });
});

describe('daysSinceTest', () => {
  it('computes elapsed days, null when never tested', () => {
    expect(daysSinceTest(systems[0], TODAY)).toBe(20);
    expect(daysSinceTest({ ...base, id: 'x', name: 'n', status: 'ok', last_test: null }, TODAY)).toBeNull();
  });
});

describe('needsAttention', () => {
  it('flags faulty, never-tested or overdue systems', () => {
    expect(needsAttention(systems[0], TODAY)).toBe(false);
    expect(needsAttention(systems[1], TODAY)).toBe(true); // defect
    expect(needsAttention(systems[2], TODAY)).toBe(true); // > 90 days
  });
});

describe('attentionCount', () => {
  it('counts systems needing attention', () => {
    expect(attentionCount(systems, TODAY)).toBe(2);
  });
});

describe('sortSystems', () => {
  it('puts systems needing attention first, then by name', () => {
    expect(sortSystems(systems, TODAY).map((s) => s.id)).toEqual(['2', '3', '1']);
  });
});
