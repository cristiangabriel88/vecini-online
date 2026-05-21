import { describe, expect, it } from 'vitest';
import {
  isSurveyClosed,
  optionPercent,
  totalResponses,
} from '@/features/surveys/surveyLogic';

const tally = { Crem: 6, 'Gri deschis': 11, Teracotă: 3 };

describe('totalResponses', () => {
  it('sums all option counts', () => {
    expect(totalResponses(tally)).toBe(20);
    expect(totalResponses({})).toBe(0);
  });
});

describe('optionPercent', () => {
  it('rounds the share of an option', () => {
    expect(optionPercent(tally, 'Gri deschis')).toBe(55);
    expect(optionPercent(tally, 'Crem')).toBe(30);
  });

  it('returns 0 for an unknown option or empty tally', () => {
    expect(optionPercent(tally, 'Albastru')).toBe(0);
    expect(optionPercent({}, 'Crem')).toBe(0);
  });
});

describe('isSurveyClosed', () => {
  const now = new Date('2026-05-21T00:00:00Z');
  it('is open when there is no closing date', () => {
    expect(isSurveyClosed(null, now)).toBe(false);
  });
  it('compares the closing date to now', () => {
    expect(isSurveyClosed('2026-06-15T00:00:00Z', now)).toBe(false);
    expect(isSurveyClosed('2026-05-01T00:00:00Z', now)).toBe(true);
  });
});
