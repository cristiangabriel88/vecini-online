import type { Bike } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';
import { DEMO_ASOCIATIE, DEMO_BIKES } from '@/shared/demo/demoData';

export type BikeFilter = 'all' | 'active' | 'abandoned';

/** A bike registration needs at least a short description. */
export function isValidBike(description: string): boolean {
  return description.trim().length >= 3;
}

/** Filter bikes by free-text query (description + serial + owner) and abandoned
 *  state, newest first. */
export function searchBikes(bikes: Bike[], query: string, filter: BikeFilter = 'all'): Bike[] {
  const q = normalizeSearch(query.trim());
  return bikes
    .filter((b) => {
      if (filter === 'active' && b.abandoned) return false;
      if (filter === 'abandoned' && !b.abandoned) return false;
      if (!q) return true;
      return normalizeSearch(`${b.description} ${b.serial ?? ''} ${b.owner_name}`).includes(q);
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// ── Per-asociatie bikes catalog ───────────────────────────────────────────────

export type BikesByAsociatie = Record<string, Bike[]>;

const EMPTY_BIKES: Bike[] = [];

export function bikesForAsociatie(
  map: BikesByAsociatie,
  asociatieId: string | null,
): Bike[] {
  if (!asociatieId) return EMPTY_BIKES;
  return map[asociatieId] ?? EMPTY_BIKES;
}

export function seedBikes(): BikesByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_BIKES] };
}

export function addBikeIn(
  map: BikesByAsociatie,
  asociatieId: string,
  bike: Bike,
): BikesByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [bike, ...current] };
}

export function toggleAbandonedIn(
  map: BikesByAsociatie,
  asociatieId: string,
  id: string,
): BikesByAsociatie {
  const bikes = map[asociatieId] ?? [];
  return {
    ...map,
    [asociatieId]: bikes.map((b) => (b.id === id ? { ...b, abandoned: !b.abandoned } : b)),
  };
}

export function migrateBikesState(persisted: unknown): BikesByAsociatie {
  const p = persisted as { byAsociatie?: BikesByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_BIKES] };
}
