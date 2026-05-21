import { describe, expect, it } from 'vitest';
import {
  cheapestQuote,
  isValidQuote,
  isValidRfp,
  sortRfps,
  sortedQuotes,
} from '@/features/rfp/rfpLogic';
import type { Rfp, RfpQuote } from '@/shared/types/domain';

const quotes: RfpQuote[] = [
  { id: 'a', rfp_id: 'r', contractor: 'Alpha', amount: 8500, selected: false },
  { id: 'b', rfp_id: 'r', contractor: 'Beta', amount: 7200, selected: false },
  { id: 'c', rfp_id: 'r', contractor: 'Gamma', amount: 9000, selected: false },
];

const rfps: Rfp[] = [
  { id: '1', asociatie_id: 'a', title: 'A', description: '', status: 'decis', created_at: '2026-05-01T00:00:00Z', quotes: [] },
  { id: '2', asociatie_id: 'a', title: 'B', description: '', status: 'deschis', created_at: '2026-05-02T00:00:00Z', quotes: [] },
  { id: '3', asociatie_id: 'a', title: 'C', description: '', status: 'deschis', created_at: '2026-05-05T00:00:00Z', quotes: [] },
];

describe('isValidRfp', () => {
  it('requires a title', () => {
    expect(isValidRfp('Reparație')).toBe(true);
    expect(isValidRfp('  ')).toBe(false);
  });
});

describe('isValidQuote', () => {
  it('requires a contractor and a positive amount', () => {
    expect(isValidQuote('Alpha', 100)).toBe(true);
    expect(isValidQuote('', 100)).toBe(false);
    expect(isValidQuote('Alpha', 0)).toBe(false);
    expect(isValidQuote('Alpha', Number.NaN)).toBe(false);
  });
});

describe('cheapestQuote', () => {
  it('finds the lowest amount', () => {
    expect(cheapestQuote(quotes)?.id).toBe('b');
  });
  it('returns null with no quotes', () => {
    expect(cheapestQuote([])).toBeNull();
  });
});

describe('sortedQuotes', () => {
  it('orders cheapest first', () => {
    expect(sortedQuotes(quotes).map((q) => q.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('sortRfps', () => {
  it('puts open RFPs first, newest within each group', () => {
    expect(sortRfps(rfps).map((r) => r.id)).toEqual(['3', '2', '1']);
  });
});
