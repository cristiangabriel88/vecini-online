import type { GroupBuy } from '@/shared/types/domain';

/** A group buy needs a short title and a valid deadline. */
export function isValidGroupBuy(title: string, deadline: string): boolean {
  if (title.trim().length < 3) return false;
  const d = new Date(deadline);
  return !Number.isNaN(d.getTime());
}

/** Open while the deadline is in the future. */
export function isOpen(gb: GroupBuy, now: Date | string | number = new Date()): boolean {
  return new Date(gb.deadline).getTime() > new Date(now).getTime();
}

/** Open group buys, soonest deadline first. */
export function activeGroupBuys(buys: GroupBuy[], now: Date | string | number = new Date()): GroupBuy[] {
  return buys
    .filter((b) => isOpen(b, now))
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
}

/** Closed group buys, most recent deadline first. */
export function closedGroupBuys(buys: GroupBuy[], now: Date | string | number = new Date()): GroupBuy[] {
  return buys
    .filter((b) => !isOpen(b, now))
    .sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime());
}

// ── Per-asociatie group buys catalog ─────────────────────────────────────────

import { DEMO_ASOCIATIE, DEMO_GROUP_BUYS } from '@/shared/demo/demoData';
import { emptyArray } from '@/shared/lib/emptyArray';

export type GroupBuysByAsociatie = Record<string, GroupBuy[]>;

const EMPTY_BUYS = emptyArray<GroupBuy>();

export function groupBuysForAsociatie(
  map: GroupBuysByAsociatie,
  asociatieId: string | null,
): GroupBuy[] {
  if (!asociatieId) return EMPTY_BUYS;
  return map[asociatieId] ?? EMPTY_BUYS;
}

export function seedGroupBuys(): GroupBuysByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_GROUP_BUYS] };
}

export function addGroupBuyIn(
  map: GroupBuysByAsociatie,
  asociatieId: string,
  buy: GroupBuy,
): GroupBuysByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [buy, ...current] };
}

export function incrementSignupsIn(
  map: GroupBuysByAsociatie,
  asociatieId: string,
  buyId: string,
): GroupBuysByAsociatie {
  const current = map[asociatieId] ?? [];
  const updated = current.map((b) => (b.id === buyId ? { ...b, signups: b.signups + 1 } : b));
  return { ...map, [asociatieId]: updated };
}

export function migrateGroupBuysState(persisted: unknown): GroupBuysByAsociatie {
  const p = persisted as { byAsociatie?: GroupBuysByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_GROUP_BUYS] };
}
