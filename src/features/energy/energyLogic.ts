import type { EnergyRecord } from '@/shared/types/domain';

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
