import { describe, expect, it } from 'vitest';
import {
  ageComponent,
  isValidFundInputs,
  recommend,
  worksComponent,
  type FundInputs,
} from '@/features/repairfund/repairFundLogic';

const NOW = new Date('2026-05-22T00:00:00Z');

const inputs = (over: Partial<FundInputs>): FundInputs => ({
  areaSqm: 2000,
  yearBuilt: 1986,
  lastMajorWorksYear: null,
  currentMonthly: 500,
  ...over,
});

describe('isValidFundInputs', () => {
  it('requires positive area and a plausible build year', () => {
    expect(isValidFundInputs(inputs({}), NOW)).toBe(true);
    expect(isValidFundInputs(inputs({ areaSqm: 0 }), NOW)).toBe(false);
    expect(isValidFundInputs(inputs({ yearBuilt: 1700 }), NOW)).toBe(false);
    expect(isValidFundInputs(inputs({ yearBuilt: 2030 }), NOW)).toBe(false);
    expect(isValidFundInputs(inputs({ lastMajorWorksYear: 1980 }), NOW)).toBe(false); // before build
  });
});

describe('ageComponent / worksComponent', () => {
  it('scales with decades and is capped', () => {
    expect(ageComponent(2026, NOW)).toBe(0);
    expect(ageComponent(2006, NOW)).toBe(0.3); // 2 decades
    expect(ageComponent(1900, NOW)).toBe(0.75); // capped
  });

  it('grows as major works age', () => {
    expect(worksComponent(1986, 2025, NOW)).toBe(0);
    expect(worksComponent(1986, 2019, NOW)).toBe(0.1);
    expect(worksComponent(1986, 2014, NOW)).toBe(0.25);
    expect(worksComponent(1986, null, NOW)).toBe(0.4); // 40 years since build
  });
});

describe('recommend', () => {
  it('combines components into a rate and a monthly gap', () => {
    const r = recommend(inputs({ areaSqm: 2000, yearBuilt: 2006, lastMajorWorksYear: 2025, currentMonthly: 500 }), NOW);
    // base 0.5 + age 0.3 + works 0 = 0.8 lei/m²
    expect(r.ratePerSqm).toBe(0.8);
    expect(r.recommendedMonthly).toBe(1600);
    expect(r.gap).toBe(1100);
  });
});
