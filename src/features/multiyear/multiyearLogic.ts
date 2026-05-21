import type { MultiyearPlanItem } from '@/shared/types/domain';

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
