import { describe, expect, it } from 'vitest';
import { tallyYesNo } from '@/features/polls/pollLogic';

const base = {
  yesOptionId: 'yes',
  noOptionId: 'no',
  totalApartments: 100,
};

describe('tallyYesNo', () => {
  it('fails when quorum is not met', () => {
    const r = tallyYesNo({
      ...base,
      counts: { yes: 10, no: 5 },
      quorumPercent: 50,
      majorityRule: 'simple',
    });
    expect(r.quorumMet).toBe(false);
    expect(r.passed).toBe(false);
  });

  it('passes with simple majority when quorum met', () => {
    const r = tallyYesNo({
      ...base,
      counts: { yes: 40, no: 20 },
      quorumPercent: 50,
      majorityRule: 'simple',
    });
    expect(r.quorumMet).toBe(true);
    expect(r.passed).toBe(true);
  });

  it('absolute majority needs more than half of all apartments', () => {
    const r = tallyYesNo({
      ...base,
      counts: { yes: 40, no: 20 },
      quorumPercent: 50,
      majorityRule: 'absolute',
    });
    expect(r.passed).toBe(false);
    const r2 = tallyYesNo({
      ...base,
      counts: { yes: 51, no: 20 },
      quorumPercent: 50,
      majorityRule: 'absolute',
    });
    expect(r2.passed).toBe(true);
  });

  it('qualified 2/3 majority of cast votes', () => {
    const r = tallyYesNo({
      ...base,
      counts: { yes: 67, no: 33 },
      quorumPercent: 50,
      majorityRule: 'qualified_2_3',
    });
    expect(r.passed).toBe(true);
    const r2 = tallyYesNo({
      ...base,
      counts: { yes: 60, no: 40 },
      quorumPercent: 50,
      majorityRule: 'qualified_2_3',
    });
    expect(r2.passed).toBe(false);
  });

  it('computes percentages', () => {
    const r = tallyYesNo({
      ...base,
      counts: { yes: 75, no: 25 },
      quorumPercent: 50,
      majorityRule: 'simple',
    });
    expect(r.percentages.yes).toBe(75);
    expect(r.percentages.no).toBe(25);
  });
});
