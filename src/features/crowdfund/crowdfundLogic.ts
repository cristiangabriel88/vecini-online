import type { Crowdfund } from '@/shared/types/domain';

/** A crowdfund needs a title and a positive target amount. */
export function isValidCrowdfund(title: string, target: number): boolean {
  return title.trim().length >= 3 && Number.isFinite(target) && target > 0;
}

/** A pledge must be a positive, finite amount. */
export function isValidPledge(amount: number): boolean {
  return Number.isFinite(amount) && amount > 0;
}

/** Open while the deadline is today or in the future. */
export function isOpen(cf: Crowdfund, now: Date = new Date()): boolean {
  const deadline = new Date(`${cf.deadline.slice(0, 10)}T23:59:59`).getTime();
  return deadline >= now.getTime();
}

/** Funded share, clamped to 0–1. */
export function fundedRatio(cf: Crowdfund): number {
  if (cf.target_amount <= 0) return 1;
  return Math.min(1, cf.pledged / cf.target_amount);
}

/** Whether the target has been met or exceeded. */
export function isFunded(cf: Crowdfund): boolean {
  return cf.pledged >= cf.target_amount;
}

/** Open crowdfunds (soonest deadline first) above closed ones (newest first). */
export function sortCrowdfunds(funds: Crowdfund[], now: Date = new Date()): Crowdfund[] {
  const open = funds
    .filter((c) => isOpen(c, now))
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  const closed = funds
    .filter((c) => !isOpen(c, now))
    .sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime());
  return [...open, ...closed];
}
