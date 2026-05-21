import type { KeyRecord } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';

/** A key record needs a space name and a holder. */
export function isValidKey(space: string, holder: string): boolean {
  return space.trim().length > 0 && holder.trim().length > 0;
}

/** A handover needs a new holder distinct from nothing (non-empty). */
export function isValidHandover(newHolder: string): boolean {
  return newHolder.trim().length > 0;
}

/** Search by space, holder or notes (accent-insensitive). */
export function searchKeys(keys: KeyRecord[], query: string): KeyRecord[] {
  const q = normalizeSearch(query.trim());
  if (!q) return keys;
  return keys.filter((k) =>
    normalizeSearch(`${k.space} ${k.holder_name} ${k.notes ?? ''}`).includes(q),
  );
}

/** Sort key records alphabetically by space. */
export function sortKeys(keys: KeyRecord[]): KeyRecord[] {
  return [...keys].sort((a, b) => a.space.localeCompare(b.space, 'ro'));
}
