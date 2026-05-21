import { describe, expect, it } from 'vitest';
import {
  activeListings,
  expiryFrom,
  isExpired,
  isValidListing,
} from '@/features/marketplace/marketplaceLogic';
import type { MarketplaceListing } from '@/shared/types/domain';

const base = { asociatie_id: 'a', seller_user_id: 'u', seller_name: 'Andrei', photo_path: null };
const NOW = '2026-05-22T09:00:00Z';

const listings: MarketplaceListing[] = [
  { ...base, id: '1', category: 'mobilă', title: 'Canapea extensibilă', description: 'gri', price: 600, expires_at: '2026-06-01T09:00:00Z', created_at: '2026-05-20T09:00:00Z' },
  { ...base, id: '2', category: 'copii', title: 'Haine copii', description: 'lot fete', price: 0, expires_at: '2026-05-30T09:00:00Z', created_at: '2026-05-17T09:00:00Z' },
  { ...base, id: '3', category: 'electrocasnice', title: 'Frigider vechi', description: 'donez', price: null, expires_at: '2026-05-10T09:00:00Z', created_at: '2026-04-26T09:00:00Z' },
];

describe('isValidListing', () => {
  it('requires a short title', () => {
    expect(isValidListing('Masă')).toBe(true);
    expect(isValidListing(' ')).toBe(false);
    expect(isValidListing('ab')).toBe(false);
  });
});

describe('expiryFrom / isExpired', () => {
  it('sets expiry 14 days out', () => {
    expect(expiryFrom('2026-05-01T00:00:00Z')).toBe('2026-05-15T00:00:00.000Z');
  });

  it('detects expired listings', () => {
    expect(isExpired(listings[2], NOW)).toBe(true);
    expect(isExpired(listings[0], NOW)).toBe(false);
  });
});

describe('activeListings', () => {
  it('drops expired listings and sorts newest first', () => {
    expect(activeListings(listings, '', 'all', NOW).map((l) => l.id)).toEqual(['1', '2']);
  });

  it('filters by category', () => {
    expect(activeListings(listings, '', 'copii', NOW).map((l) => l.id)).toEqual(['2']);
  });

  it('matches free text ignoring diacritics', () => {
    expect(activeListings(listings, 'canapea', 'all', NOW).map((l) => l.id)).toEqual(['1']);
    expect(activeListings(listings, 'mobila', 'all', NOW).map((l) => l.id)).toEqual(['1']);
  });
});
