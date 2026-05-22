import type { WelcomeKitItem } from '@/shared/types/domain';

/** A welcome-kit step needs a title and a one-line explanation. */
export function isValidItem(title: string, body: string): boolean {
  return title.trim().length >= 3 && body.trim().length >= 3;
}

/** Steps shown in ascending order (ties broken by id for stability). */
export function sortItems(items: WelcomeKitItem[]): WelcomeKitItem[] {
  return [...items].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.id.localeCompare(b.id);
  });
}

/** The next free order number, so a freshly-added step lands at the end. */
export function nextOrder(items: WelcomeKitItem[]): number {
  return items.reduce((max, i) => Math.max(max, i.order), 0) + 1;
}

/** How far through the kit the resident is. `percent` is rounded 0–100. */
export function completion(
  items: WelcomeKitItem[],
  doneIds: ReadonlySet<string>,
): { done: number; total: number; percent: number } {
  const total = items.length;
  const done = items.filter((i) => doneIds.has(i.id)).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, percent };
}

/** The kit is complete once every step is checked off (and there is at least one). */
export function isComplete(items: WelcomeKitItem[], doneIds: ReadonlySet<string>): boolean {
  return items.length > 0 && items.every((i) => doneIds.has(i.id));
}
