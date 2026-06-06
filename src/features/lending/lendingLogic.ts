import type { LendingItem } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';
import { DEMO_ASOCIATIE, DEMO_LENDING_ITEMS } from '@/shared/demo/demoData';
import { emptyArray } from '@/shared/lib/emptyArray';

export type AvailabilityFilter = 'all' | 'available';

/** Minimum length for a usable item name. */
export const MIN_ITEM_NAME = 2;

/** Whether a new lending item has the fields it needs. */
export function isValidItem(name: string, category: string): boolean {
  return name.trim().length >= MIN_ITEM_NAME && category.trim().length > 0;
}

/** Filter lending items by free-text query (name + category) and availability,
 *  newest first. */
export function searchLendingItems(
  items: LendingItem[],
  query: string,
  filter: AvailabilityFilter = 'all',
): LendingItem[] {
  const q = normalizeSearch(query.trim());
  return items
    .filter((it) => {
      if (filter === 'available' && !it.available) return false;
      if (!q) return true;
      return normalizeSearch(`${it.name} ${it.category}`).includes(q);
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// ── Per-asociatie lending item catalog ───────────────────────────────────────

/** Lending items keyed by asociatie id. */
export type LendingByAsociatie = Record<string, LendingItem[]>;

const EMPTY_LENDING = emptyArray<LendingItem>();

export function lendingForAsociatie(
  map: LendingByAsociatie,
  asociatieId: string | null,
): LendingItem[] {
  if (!asociatieId) return EMPTY_LENDING;
  return map[asociatieId] ?? EMPTY_LENDING;
}

export function seedLending(): LendingByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_LENDING_ITEMS] };
}

export function addLendingIn(
  map: LendingByAsociatie,
  asociatieId: string,
  item: LendingItem,
): LendingByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [item, ...current] };
}

export function toggleAvailableIn(
  map: LendingByAsociatie,
  asociatieId: string,
  id: string,
): LendingByAsociatie {
  const items = map[asociatieId] ?? [];
  return {
    ...map,
    [asociatieId]: items.map((it) =>
      it.id === id ? { ...it, available: !it.available } : it,
    ),
  };
}

export function migrateLendingState(persisted: unknown): LendingByAsociatie {
  const p = persisted as { byAsociatie?: LendingByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_LENDING_ITEMS] };
}
