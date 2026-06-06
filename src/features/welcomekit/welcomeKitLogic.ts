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
export function isComplete(items: WelcomeKitItem[], doneIds: ReadonlySet<string> | readonly string[]): boolean {
  const set = Array.isArray(doneIds) ? new Set(doneIds) : (doneIds as ReadonlySet<string>);
  return items.length > 0 && items.every((i) => set.has(i.id));
}

// ── Per-asociatie welcome-kit catalog ─────────────────────────────────────────

import { DEMO_ASOCIATIE, DEMO_WELCOME_KIT } from '@/shared/demo/demoData';
import { emptyArray } from '@/shared/lib/emptyArray';

export type WelcomeKitsByAsociatie = Record<string, WelcomeKitItem[]>;

const EMPTY_KIT = emptyArray<WelcomeKitItem>();

export function welcomeKitForAsociatie(
  map: WelcomeKitsByAsociatie,
  asociatieId: string | null,
): WelcomeKitItem[] {
  if (!asociatieId) return EMPTY_KIT;
  return map[asociatieId] ?? EMPTY_KIT;
}

export function seedWelcomeKit(): WelcomeKitsByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_WELCOME_KIT] };
}

export function addWelcomeKitItemIn(
  map: WelcomeKitsByAsociatie,
  asociatieId: string,
  item: WelcomeKitItem,
): WelcomeKitsByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [...current, item] };
}

export function removeWelcomeKitItemIn(
  map: WelcomeKitsByAsociatie,
  asociatieId: string,
  itemId: string,
): WelcomeKitsByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: current.filter((i) => i.id !== itemId) };
}

export function migrateWelcomeKitState(persisted: unknown): WelcomeKitsByAsociatie {
  const p = persisted as { byAsociatie?: WelcomeKitsByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_WELCOME_KIT] };
}
