import type { Crowdfund } from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_CROWDFUNDS } from '@/shared/demo/demoData';
import { emptyArray } from '@/shared/lib/emptyArray';

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

// ── Per-asociatie crowdfund catalog ──────────────────────────────────────────

export type CrowdfundsByAsociatie = Record<string, Crowdfund[]>;

const EMPTY_CROWDFUNDS = emptyArray<Crowdfund>();

export function crowdfundsForAsociatie(
  map: CrowdfundsByAsociatie,
  asociatieId: string | null,
): Crowdfund[] {
  if (!asociatieId) return EMPTY_CROWDFUNDS;
  return map[asociatieId] ?? EMPTY_CROWDFUNDS;
}

export function seedCrowdfunds(): CrowdfundsByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_CROWDFUNDS] };
}

export function addCrowdfundIn(
  map: CrowdfundsByAsociatie,
  asociatieId: string,
  fund: Crowdfund,
): CrowdfundsByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [fund, ...current] };
}

export function migrateCrowdfundsState(persisted: unknown): CrowdfundsByAsociatie {
  const p = persisted as { byAsociatie?: CrowdfundsByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_CROWDFUNDS] };
}
