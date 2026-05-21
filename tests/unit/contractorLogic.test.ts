import { describe, expect, it } from 'vitest';
import {
  applyRating,
  filterAvailable,
  isValidContractor,
  isValidRating,
  searchContractors,
  sortByRating,
} from '@/features/contractors/contractorLogic';
import type { Contractor } from '@/shared/types/domain';

const base = { asociatie_id: 'a', price_tier: 'mediu', contact: '', last_used: null };

const contractors: Contractor[] = [
  { ...base, id: '1', name: 'Alpha Instal', specialty: 'Instalații sanitare', available: true, rating: 3, rating_count: 2 },
  { ...base, id: '2', name: 'Beta Electric', specialty: 'Electrice', available: false, rating: 5, rating_count: 1 },
  { ...base, id: '3', name: 'Gamma Zugrav', specialty: 'Zugrăveli', available: true, rating: 4, rating_count: 4 },
];

describe('isValidContractor', () => {
  it('requires a name and a specialty', () => {
    expect(isValidContractor('Alpha', 'Sanitare')).toBe(true);
    expect(isValidContractor(' ', 'Sanitare')).toBe(false);
    expect(isValidContractor('Alpha', '')).toBe(false);
  });
});

describe('isValidRating', () => {
  it('accepts integers 0–5 only', () => {
    expect(isValidRating(0)).toBe(true);
    expect(isValidRating(5)).toBe(true);
    expect(isValidRating(6)).toBe(false);
    expect(isValidRating(3.5)).toBe(false);
  });
});

describe('searchContractors', () => {
  it('matches name or specialty accent-insensitively', () => {
    expect(searchContractors(contractors, 'zugraveli').map((c) => c.id)).toEqual(['3']);
    expect(searchContractors(contractors, 'electric').map((c) => c.id)).toEqual(['2']);
  });
});

describe('filterAvailable', () => {
  it('keeps only available when requested', () => {
    expect(filterAvailable(contractors, true).map((c) => c.id)).toEqual(['1', '3']);
    expect(filterAvailable(contractors, false)).toHaveLength(3);
  });
});

describe('sortByRating', () => {
  it('orders by highest rating then name', () => {
    expect(sortByRating(contractors).map((c) => c.id)).toEqual(['2', '3', '1']);
  });
});

describe('applyRating', () => {
  it('folds a new rating into the running average', () => {
    expect(applyRating({ rating: 4, rating_count: 1 }, 2)).toEqual({ rating: 3, rating_count: 2 });
  });
  it('handles the first rating', () => {
    expect(applyRating({ rating: 0, rating_count: 0 }, 5)).toEqual({ rating: 5, rating_count: 1 });
  });
});
