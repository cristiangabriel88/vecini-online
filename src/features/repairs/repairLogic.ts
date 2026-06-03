import type { RepairRecord, RepairSystem, Role } from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_REPAIRS } from '@/shared/demo/demoData';
import { normalizeSearch } from '@/features/faq/faqLogic';

export type WarrantyStatus = 'none' | 'expired' | 'expiring' | 'active';

/** Per-asociatie repair records catalog, keyed by asociatie id. */
export type RepairsByAsociatie = Record<string, RepairRecord[]>;

const EMPTY_REPAIRS: RepairRecord[] = [];

/** Get the repair records for one asociatie (never null). */
export function repairsForAsociatie(
  map: RepairsByAsociatie,
  asociatieId: string | null,
): RepairRecord[] {
  if (!asociatieId) return EMPTY_REPAIRS;
  return map[asociatieId] ?? EMPTY_REPAIRS;
}

/** Initial store state: the demo asociatie is seeded. */
export function seedRepairs(): RepairsByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_REPAIRS] };
}

/** Prepend one record to an asociatie's list. */
export function addRepairIn(
  map: RepairsByAsociatie,
  asociatieId: string,
  record: RepairRecord,
): RepairsByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [record, ...current] };
}

/** Migrate persisted state; always reseeds the demo asociatie. */
export function migrateRepairsState(persisted: unknown): RepairsByAsociatie {
  const p = persisted as { byAsociatie?: RepairsByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_REPAIRS] };
}

/** Build a new RepairRecord domain object from admin form input. */
export function newRepairRecord(
  input: {
    title: string;
    system: RepairSystem;
    description: string;
    contractor: string;
    cost: string;
    warrantyUntil: string;
    performedAt: string;
  },
  asociatieId: string,
): RepairRecord {
  return {
    id: `rr-${Date.now()}`,
    asociatie_id: asociatieId,
    system: input.system,
    title: input.title.trim(),
    description: input.description.trim(),
    contractor: input.contractor.trim() || null,
    cost: input.cost.trim() ? Number(input.cost.replace(',', '.')) : null,
    warranty_until: input.warrantyUntil || null,
    performed_at: input.performedAt,
    created_at: new Date().toISOString(),
  };
}

/** Whether the role can add/manage repair records. */
export function canManageRepairs(role: Role | null): boolean {
  return role === 'admin' || role === 'presedinte' || role === 'comitet';
}

/** Days before warranty expiry at which we surface an "expiring soon" alert. */
export const WARRANTY_ALERT_DAYS = 30;

/** Classify a repair's warranty relative to `now`. */
export function warrantyStatus(
  warrantyUntil: string | null,
  now: Date = new Date(),
): WarrantyStatus {
  if (!warrantyUntil) return 'none';
  const end = new Date(warrantyUntil).getTime();
  const today = now.getTime();
  if (end < today) return 'expired';
  const days = (end - today) / 86_400_000;
  return days <= WARRANTY_ALERT_DAYS ? 'expiring' : 'active';
}

/** Filter repair records by free-text query and optional system. */
export function searchRepairs(
  records: RepairRecord[],
  query: string,
  system: RepairRecord['system'] | 'all' = 'all',
): RepairRecord[] {
  const q = normalizeSearch(query.trim());
  return records.filter((r) => {
    if (system !== 'all' && r.system !== system) return false;
    if (!q) return true;
    return normalizeSearch(`${r.title} ${r.description} ${r.contractor ?? ''}`).includes(q);
  });
}
