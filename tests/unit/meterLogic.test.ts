import { describe, expect, it } from 'vitest';
import { validateReading, consumption, isAnomaly, ANOMALY_FACTOR } from '@/features/meters/meterLogic';

describe('validateReading', () => {
  it('rejects non-numbers and readings below the previous index', () => {
    expect(validateReading(NaN, 100)).toEqual({ ok: false, reason: 'not_a_number' });
    expect(validateReading(90, 100)).toEqual({ ok: false, reason: 'below_previous' });
    expect(validateReading(100, 100)).toEqual({ ok: true });
    expect(validateReading(120, 100)).toEqual({ ok: true });
  });
});

describe('consumption + anomaly', () => {
  it('computes non-negative consumption', () => {
    expect(consumption(120, 100)).toBe(20);
    expect(consumption(100, 100)).toBe(0);
  });

  it('flags jumps beyond the anomaly factor of expected', () => {
    const expected = 6;
    expect(isAnomaly(106, 100, expected)).toBe(false); // 6 == expected
    expect(isAnomaly(118, 100, expected)).toBe(false); // 18 == 3x expected, not >
    expect(isAnomaly(119, 100, expected)).toBe(true); // 19 > 3x expected
    expect(isAnomaly(1000, 100, 0)).toBe(false); // no expectation
  });

  it('exposes the default factor', () => {
    expect(ANOMALY_FACTOR).toBe(3);
  });
});
