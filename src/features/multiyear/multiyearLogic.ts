import type { MultiyearPlanItem } from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_MULTIYEAR } from '@/shared/demo/demoData';
import { emptyArray } from '@/shared/lib/emptyArray';

/** A plan item needs a plausible year and a short title. */
export function isValidPlanItem(year: number, title: string): boolean {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return false;
  return title.trim().length >= 3;
}

/** Items ordered by year ascending, then title. */
export function sortByYear(items: MultiyearPlanItem[]): MultiyearPlanItem[] {
  return [...items].sort((a, b) => a.year - b.year || a.title.localeCompare(b.title, 'ro'));
}

/** Total estimated cost across all items. */
export function totalEstimated(items: MultiyearPlanItem[]): number {
  return items.reduce((sum, i) => sum + (i.estimated_cost || 0), 0);
}

/** Items grouped into year buckets, years ascending. */
export function groupByYear(items: MultiyearPlanItem[]): { year: number; items: MultiyearPlanItem[] }[] {
  const buckets = new Map<number, MultiyearPlanItem[]>();
  for (const item of sortByYear(items)) {
    const list = buckets.get(item.year) ?? [];
    list.push(item);
    buckets.set(item.year, list);
  }
  return [...buckets.entries()].map(([year, list]) => ({ year, items: list }));
}

// ── Per-asociatie multiyear catalog ──────────────────────────────────────────

export type MultiyearByAsociatie = Record<string, MultiyearPlanItem[]>;

const EMPTY_MULTIYEAR = emptyArray<MultiyearPlanItem>();

export function multiyearForAsociatie(
  map: MultiyearByAsociatie,
  asociatieId: string | null,
): MultiyearPlanItem[] {
  if (!asociatieId) return EMPTY_MULTIYEAR;
  return map[asociatieId] ?? EMPTY_MULTIYEAR;
}

export function seedMultiyear(): MultiyearByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_MULTIYEAR] };
}

export function addMultiyearIn(
  map: MultiyearByAsociatie,
  asociatieId: string,
  item: MultiyearPlanItem,
): MultiyearByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [item, ...current] };
}

export function migrateMultiyearState(persisted: unknown): MultiyearByAsociatie {
  const p = persisted as { byAsociatie?: MultiyearByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_MULTIYEAR] };
}
