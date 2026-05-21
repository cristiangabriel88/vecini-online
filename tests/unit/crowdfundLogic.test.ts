import { describe, expect, it } from 'vitest';
import {
  fundedRatio,
  isFunded,
  isOpen,
  isValidCrowdfund,
  isValidPledge,
  sortCrowdfunds,
} from '@/features/crowdfund/crowdfundLogic';
import type { Crowdfund } from '@/shared/types/domain';

const NOW = new Date('2026-05-22T09:00:00Z');
const base = { asociatie_id: 'a', description: '', created_at: '2026-05-01T00:00:00Z' };

const cf = (over: Partial<Crowdfund>): Crowdfund => ({
  ...base,
  id: 'x',
  title: 'Loc de joacă',
  target_amount: 4000,
  deadline: '2026-06-30',
  pledged: 0,
  ...over,
});

describe('validation', () => {
  it('validates crowdfund and pledge inputs', () => {
    expect(isValidCrowdfund('Loc de joacă', 4000)).toBe(true);
    expect(isValidCrowdfund('ab', 4000)).toBe(false);
    expect(isValidCrowdfund('Loc de joacă', 0)).toBe(false);
    expect(isValidPledge(50)).toBe(true);
    expect(isValidPledge(0)).toBe(false);
    expect(isValidPledge(NaN)).toBe(false);
  });
});

describe('isOpen / fundedRatio / isFunded', () => {
  it('tracks deadline and funding', () => {
    expect(isOpen(cf({ deadline: '2026-06-30' }), NOW)).toBe(true);
    expect(isOpen(cf({ deadline: '2026-05-01' }), NOW)).toBe(false);
    expect(fundedRatio(cf({ pledged: 1000, target_amount: 4000 }))).toBe(0.25);
    expect(fundedRatio(cf({ pledged: 5000, target_amount: 4000 }))).toBe(1);
    expect(isFunded(cf({ pledged: 4000, target_amount: 4000 }))).toBe(true);
  });
});

describe('sortCrowdfunds', () => {
  it('places open funds (soonest first) above closed ones', () => {
    const list = [
      cf({ id: 'closed', deadline: '2026-05-01' }),
      cf({ id: 'far', deadline: '2026-07-30' }),
      cf({ id: 'soon', deadline: '2026-05-30' }),
    ];
    expect(sortCrowdfunds(list, NOW).map((c) => c.id)).toEqual(['soon', 'far', 'closed']);
  });
});
