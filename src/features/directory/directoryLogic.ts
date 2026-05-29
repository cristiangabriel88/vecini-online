import type { DirectoryEntry } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';

/** A neighbour-visible custom field surfaced in the F36 directory card. */
export interface DirectoryCustomField {
  label: string;
  value: string;
}

/** The fields a resident has consented to show, after applying their flags. */
export interface VisibleEntry {
  id: string;
  name: string | null;
  apartment: string | null;
  phone: string | null;
  email: string | null;
  /** F66 custom fields the resident marked visible to neighbours. */
  customFields: DirectoryCustomField[];
}

export function visibleEntry(
  e: DirectoryEntry,
  neighbourFields: DirectoryCustomField[] = [],
): VisibleEntry {
  return {
    id: e.id,
    name: e.show_name ? e.name : null,
    apartment: e.show_apartment ? e.apartment : null,
    phone: e.show_phone ? e.phone : null,
    email: e.show_email ? e.email : null,
    customFields: neighbourFields,
  };
}

/** A resident is listed only if they expose their name (something to display). */
export function isListed(e: DirectoryEntry): boolean {
  return e.show_name;
}

/** Listed entries matching the query over their visible name/apartment. */
export function searchDirectory(
  entries: DirectoryEntry[],
  query: string,
  neighbourFieldsMap: Record<string, DirectoryCustomField[]> = {},
): VisibleEntry[] {
  const q = normalizeSearch(query.trim());
  return entries
    .filter(isListed)
    .map((e) => visibleEntry(e, neighbourFieldsMap[e.id] ?? []))
    .filter((v) => !q || normalizeSearch(`${v.name ?? ''} ${v.apartment ?? ''}`).includes(q));
}
