import { describe, expect, it } from 'vitest';
import {
  formatPeriod,
  isValidEnergyRecord,
  sortedRecords,
  totalCost,
  totalsByKind,
} from '@/features/energy/energyLogic';
import type { EnergyRecord } from '@/shared/types/domain';

const base = { asociatie_id: 'a' };
const records: EnergyRecord[] = [
  { ...base, id: '1', period: '2026-04-01', kind: 'Lift', amount: 320, cost: 245 },
  { ...base, id: '2', period: '2026-04-01', kind: 'Iluminat comun', amount: 540, cost: 410 },
  { ...base, id: '3', period: '2026-03-01', kind: 'Lift', amount: 335, cost: 256 },
];

describe('isValidEnergyRecord', () => {
  it('requires non-negative numbers with at least one positive', () => {
    expect(isValidEnergyRecord(540, 410)).toBe(true);
    expect(isValidEnergyRecord(0, 410)).toBe(true);
    expect(isValidEnergyRecord(0, 0)).toBe(false);
    expect(isValidEnergyRecord(-5, 10)).toBe(false);
    expect(isValidEnergyRecord(Number.NaN, 10)).toBe(false);
  });
});

describe('formatPeriod', () => {
  it('formats as Romanian month + year', () => {
    expect(formatPeriod('2026-04-01')).toBe('aprilie 2026');
  });
});

describe('sortedRecords', () => {
  it('orders newest period first, then by kind', () => {
    expect(sortedRecords(records).map((r) => r.id)).toEqual(['2', '1', '3']);
  });
});

describe('totalCost / totalsByKind', () => {
  it('sums cost across records', () => {
    expect(totalCost(records)).toBe(911);
  });

  it('groups amount and cost by kind', () => {
    expect(totalsByKind(records)).toEqual({
      Lift: { amount: 655, cost: 501 },
      'Iluminat comun': { amount: 540, cost: 410 },
    });
  });
});
