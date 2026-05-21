import { describe, expect, it } from 'vitest';
import { groupByYear, isValidPlanItem, sortByYear, totalEstimated } from '@/features/multiyear/multiyearLogic';
import type { MultiyearPlanItem } from '@/shared/types/domain';

const base = { asociatie_id: 'a', notes: null };
const items: MultiyearPlanItem[] = [
  { ...base, id: '1', year: 2029, title: 'Anvelopare', estimated_cost: 320000 },
  { ...base, id: '2', year: 2026, title: 'Acoperiș', estimated_cost: 45000 },
  { ...base, id: '3', year: 2026, title: 'Bordură curte', estimated_cost: 5000 },
];

describe('isValidPlanItem', () => {
  it('requires a plausible year and a short title', () => {
    expect(isValidPlanItem(2027, 'Coloane apă')).toBe(true);
    expect(isValidPlanItem(1990, 'Coloane apă')).toBe(false);
    expect(isValidPlanItem(2027, 'ab')).toBe(false);
    expect(isValidPlanItem(2027.5, 'Coloane apă')).toBe(false);
  });
});

describe('sortByYear', () => {
  it('orders by year then title', () => {
    expect(sortByYear(items).map((i) => i.id)).toEqual(['2', '3', '1']);
  });
});

describe('totalEstimated', () => {
  it('sums estimated cost', () => {
    expect(totalEstimated(items)).toBe(370000);
  });
});

describe('groupByYear', () => {
  it('buckets items by year ascending', () => {
    const groups = groupByYear(items);
    expect(groups.map((g) => g.year)).toEqual([2026, 2029]);
    expect(groups[0].items.map((i) => i.id)).toEqual(['2', '3']);
  });
});
