import type { DirectoryEntry } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';

/** The fields a resident has consented to show, after applying their flags. */
export interface VisibleEntry {
  id: string;
  name: string | null;
  apartment: string | null;
  phone: string | null;
  email: string | null;
}

export function visibleEntry(e: DirectoryEntry): VisibleEntry {
  return {
    id: e.id,
    name: e.show_name ? e.name : null,
    apartment: e.show_apartment ? e.apartment : null,
    phone: e.show_phone ? e.phone : null,
    email: e.show_email ? e.email : null,
  };
}

/** A resident is listed only if they expose their name (something to display). */
export function isListed(e: DirectoryEntry): boolean {
  return e.show_name;
}

/** Listed entries matching the query over their visible name/apartment. */
export function searchDirectory(entries: DirectoryEntry[], query: string): VisibleEntry[] {
  const q = normalizeSearch(query.trim());
  return entries
    .filter(isListed)
    .map(visibleEntry)
    .filter((v) => !q || normalizeSearch(`${v.name ?? ''} ${v.apartment ?? ''}`).includes(q));
}
