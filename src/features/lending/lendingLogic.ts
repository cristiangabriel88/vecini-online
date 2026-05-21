import type { LendingItem } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';

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
