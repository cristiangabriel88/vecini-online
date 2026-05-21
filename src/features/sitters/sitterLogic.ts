import type { SitterProfile } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';

/** Sitting kinds offered on the board. */
export const SITTER_KINDS = ['babysitting', 'petsitting'] as const;

/** A profile needs at least a short availability note. */
export function isValidSitter(availability: string): boolean {
  return availability.trim().length >= 2;
}

/** Filter by kind ('all' = any) + free-text over name/availability/rate, by name. */
export function searchSitters(
  profiles: SitterProfile[],
  kind = 'all',
  query = '',
): SitterProfile[] {
  const q = normalizeSearch(query.trim());
  return profiles
    .filter((p) => (kind === 'all' ? true : p.kind === kind))
    .filter((p) =>
      q ? normalizeSearch(`${p.user_name} ${p.availability} ${p.rate}`).includes(q) : true,
    )
    .sort((a, b) => a.user_name.localeCompare(b.user_name, 'ro'));
}
