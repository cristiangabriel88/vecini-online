import type { EnergyRecord } from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_ENERGY } from '@/shared/demo/demoData';
import { emptyArray } from '@/shared/lib/emptyArray';

/** Common-area energy consumption categories. */
export const ENERGY_KINDS = [
  'Iluminat comun',
  'Lift',
  'Încălzire comună',
  'Apă comună',
  'Altele',
] as const;

const MONTHS_RO = [
  'ianuarie',
  'februarie',
  'martie',
  'aprilie',
  'mai',
  'iunie',
  'iulie',
  'august',
  'septembrie',
  'octombrie',
  'noiembrie',
  'decembrie',
];

/** A record needs a non-negative amount and cost, with at least one set. */
export function isValidEnergyRecord(amount: number, cost: number): boolean {
  if (!Number.isFinite(amount) || !Number.isFinite(cost)) return false;
  if (amount < 0 || cost < 0) return false;
  return amount > 0 || cost > 0;
}

/** Format a period ISO date as "aprilie 2026". */
export function formatPeriod(period: string): string {
  const d = new Date(period);
  return `${MONTHS_RO[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Records newest period first, then by kind. */
export function sortedRecords(records: EnergyRecord[]): EnergyRecord[] {
  return [...records].sort((a, b) => {
    const diff = new Date(b.period).getTime() - new Date(a.period).getTime();
    return diff !== 0 ? diff : a.kind.localeCompare(b.kind, 'ro');
  });
}

/** Total cost across the given records. */
export function totalCost(records: EnergyRecord[]): number {
  return records.reduce((sum, r) => sum + r.cost, 0);
}

/** Sum of amount and cost grouped by kind. */
export function totalsByKind(records: EnergyRecord[]): Record<string, { amount: number; cost: number }> {
  const out: Record<string, { amount: number; cost: number }> = {};
  for (const r of records) {
    const e = out[r.kind] ?? { amount: 0, cost: 0 };
    e.amount += r.amount;
    e.cost += r.cost;
    out[r.kind] = e;
  }
  return out;
}

// ── Per-asociatie energy catalog ─────────────────────────────────────────────

export type EnergyByAsociatie = Record<string, EnergyRecord[]>;

const EMPTY_ENERGY = emptyArray<EnergyRecord>();

export function energyForAsociatie(map: EnergyByAsociatie, asociatieId: string | null): EnergyRecord[] {
  if (!asociatieId) return EMPTY_ENERGY;
  return map[asociatieId] ?? EMPTY_ENERGY;
}

export function seedEnergy(): EnergyByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_ENERGY] };
}

export function addEnergyIn(
  map: EnergyByAsociatie,
  asociatieId: string,
  record: EnergyRecord,
): EnergyByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [record, ...current] };
}

export function migrateEnergyState(persisted: unknown): EnergyByAsociatie {
  const p = persisted as { byAsociatie?: EnergyByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_ENERGY] };
}
