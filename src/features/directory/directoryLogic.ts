import type { DirectoryEntry } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';
import { DEMO_ASOCIATIE, DEMO_DIRECTORY } from '@/shared/demo/demoData';

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

// ── Per-asociatie directory catalog ─────────────────────────────────────────

export type DirectoryByAsociatie = Record<string, DirectoryEntry[]>;

const EMPTY_DIRECTORY: DirectoryEntry[] = [];

export function directoryForAsociatie(
  map: DirectoryByAsociatie,
  asociatieId: string | null,
): DirectoryEntry[] {
  if (!asociatieId) return EMPTY_DIRECTORY;
  return map[asociatieId] ?? EMPTY_DIRECTORY;
}

export function seedDirectory(): DirectoryByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_DIRECTORY] };
}

export function replaceDirectoryIn(
  map: DirectoryByAsociatie,
  asociatieId: string,
  entries: DirectoryEntry[],
): DirectoryByAsociatie {
  return { ...map, [asociatieId]: entries };
}

export function toggleConsentIn(
  map: DirectoryByAsociatie,
  asociatieId: string,
  userId: string,
  field: 'show_name' | 'show_apartment' | 'show_phone' | 'show_email',
): DirectoryByAsociatie {
  const entries = map[asociatieId] ?? [];
  const updated = entries.map((e) => (e.user_id === userId ? { ...e, [field]: !e[field] } : e));
  return { ...map, [asociatieId]: updated };
}

export function migrateDirectoryState(persisted: unknown): DirectoryByAsociatie {
  const p = persisted as { byAsociatie?: DirectoryByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_DIRECTORY] };
}
