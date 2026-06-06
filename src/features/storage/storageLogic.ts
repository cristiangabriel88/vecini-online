import type { StorageUnit } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';
import { DEMO_ASOCIATIE, DEMO_STORAGE_UNITS } from '@/shared/demo/demoData';
import { emptyArray } from '@/shared/lib/emptyArray';

export type StorageFilter = 'all' | 'assigned' | 'unassigned';

/** A storage unit needs at least a short label. */
export function isValidStorageUnit(label: string): boolean {
  return label.trim().length >= 2;
}

/** Filter storage units by assignment state and free-text query
 *  (label + apartment + notes), assigned units first then by label. */
export function searchStorageUnits(
  units: StorageUnit[],
  query = '',
  filter: StorageFilter = 'all',
): StorageUnit[] {
  const q = normalizeSearch(query.trim());
  return units
    .filter((u) => {
      if (filter === 'assigned' && !u.apartment_id) return false;
      if (filter === 'unassigned' && u.apartment_id) return false;
      if (!q) return true;
      return normalizeSearch(`${u.label} ${u.apartment_label ?? ''} ${u.notes ?? ''}`).includes(q);
    })
    .sort((a, b) => {
      const aAssigned = a.apartment_id ? 0 : 1;
      const bAssigned = b.apartment_id ? 0 : 1;
      if (aAssigned !== bAssigned) return aAssigned - bAssigned;
      return a.label.localeCompare(b.label, 'ro');
    });
}

// ── Per-asociatie storage catalog ────────────────────────────────────────────

export type StorageByAsociatie = Record<string, StorageUnit[]>;

const EMPTY_UNITS = emptyArray<StorageUnit>();

export function storageForAsociatie(
  map: StorageByAsociatie,
  asociatieId: string | null,
): StorageUnit[] {
  if (!asociatieId) return EMPTY_UNITS;
  return map[asociatieId] ?? EMPTY_UNITS;
}

export function seedStorageUnits(): StorageByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_STORAGE_UNITS] };
}

export function addStorageIn(
  map: StorageByAsociatie,
  asociatieId: string,
  unit: StorageUnit,
): StorageByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [unit, ...current] };
}

export function migrateStorageState(persisted: unknown): StorageByAsociatie {
  const p = persisted as { byAsociatie?: StorageByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_STORAGE_UNITS] };
}
