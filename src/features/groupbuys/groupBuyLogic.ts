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
