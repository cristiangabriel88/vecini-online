import type { MarketplaceListing } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';

/** Listing categories offered in the compose form / filter. */
export const MARKETPLACE_CATEGORIES = [
  'mobilă',
  'electrocasnice',
  'copii',
  'electronice',
  'cărți',
  'altele',
] as const;

/** Listings auto-expire 14 days after posting (spec F57). */
export const LISTING_TTL_DAYS = 14;

/** A listing needs at least a short title. */
export function isValidListing(title: string): boolean {
  return title.trim().length >= 3;
}

/** Expiry timestamp for a listing created at `from`. */
export function expiryFrom(from: Date | string | number): string {
  const d = new Date(from);
  d.setDate(d.getDate() + LISTING_TTL_DAYS);
  return d.toISOString();
}

/** True once a listing's expiry has passed. */
export function isExpired(listing: MarketplaceListing, now: Date | string | number = new Date()): boolean {
  return new Date(listing.expires_at).getTime() <= new Date(now).getTime();
}

/** Active (non-expired) listings filtered by category + free-text query, newest first. */
export function activeListings(
  listings: MarketplaceListing[],
  query = '',
  category = 'all',
  now: Date | string | number = new Date(),
): MarketplaceListing[] {
  const q = normalizeSearch(query.trim());
  return listings
    .filter((l) => !isExpired(l, now))
    .filter((l) => (category === 'all' ? true : l.category === category))
    .filter((l) => (q ? normalizeSearch(`${l.title} ${l.description} ${l.category}`).includes(q) : true))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// ── Per-asociatie marketplace catalog ───────────────────────────────────────

import { DEMO_ASOCIATIE, DEMO_MARKETPLACE } from '@/shared/demo/demoData';
import { emptyArray } from '@/shared/lib/emptyArray';

export type MarketplacesByAsociatie = Record<string, MarketplaceListing[]>;

const EMPTY_LISTINGS = emptyArray<MarketplaceListing>();

export function marketplaceForAsociatie(
  map: MarketplacesByAsociatie,
  asociatieId: string | null,
): MarketplaceListing[] {
  if (!asociatieId) return EMPTY_LISTINGS;
  return map[asociatieId] ?? EMPTY_LISTINGS;
}

export function seedMarketplace(): MarketplacesByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_MARKETPLACE] };
}

export function addListingIn(
  map: MarketplacesByAsociatie,
  asociatieId: string,
  item: MarketplaceListing,
): MarketplacesByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [item, ...current] };
}

export function migrateMarketplaceState(persisted: unknown): MarketplacesByAsociatie {
  const p = persisted as { byAsociatie?: MarketplacesByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_MARKETPLACE] };
}
