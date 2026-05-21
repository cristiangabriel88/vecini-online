import type { Bike } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';

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
