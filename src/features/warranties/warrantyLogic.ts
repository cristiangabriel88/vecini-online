import type { Warranty } from '@/shared/types/domain';
import { warrantyStatus, type WarrantyStatus } from '@/features/repairs/repairLogic';
import { DEMO_ASOCIATIE, DEMO_WARRANTIES } from '@/shared/demo/demoData';

export { warrantyStatus, WARRANTY_ALERT_DAYS } from '@/features/repairs/repairLogic';
export type { WarrantyStatus } from '@/features/repairs/repairLogic';

/** Compute the expiry date `months` after `purchasedAt` (ISO `YYYY-MM-DD`).
 *  Works on calendar components (no timezone drift) and clamps to the last day
 *  of the target month when the original day doesn't exist there. */
export function computeExpiry(purchasedAt: string, months: number): string {
  const [y, m, d] = purchasedAt.slice(0, 10).split('-').map(Number);
  const totalMonth = m - 1 + months;
  const year = y + Math.floor(totalMonth / 12);
  const month = totalMonth % 12; // 0-indexed
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/** A warranty needs an asset name, a purchase date and a positive duration. */
export function isValidWarranty(asset: string, purchasedAt: string, months: number): boolean {
  return asset.trim().length > 0 && purchasedAt.trim().length > 0 && months > 0;
}

/** Sort warranties by expiry date ascending (soonest first). */
export function sortByExpiry(warranties: Warranty[]): Warranty[] {
  return [...warranties].sort(
    (a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime(),
  );
}

/** Count warranties that are expired or expiring soon — used by the digest. */
export function countAlerts(warranties: Warranty[], now: Date = new Date()): number {
  return warranties.filter((w) => {
    const s: WarrantyStatus = warrantyStatus(w.expires_at, now);
    return s === 'expired' || s === 'expiring';
  }).length;
}

// ── Per-asociatie warranty catalog ───────────────────────────────────────────

export type WarrantiesByAsociatie = Record<string, Warranty[]>;

const EMPTY_WARRANTIES: Warranty[] = [];

export function warrantiesForAsociatie(map: WarrantiesByAsociatie, asociatieId: string | null): Warranty[] {
  if (!asociatieId) return EMPTY_WARRANTIES;
  return map[asociatieId] ?? EMPTY_WARRANTIES;
}

export function seedWarranties(): WarrantiesByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_WARRANTIES] };
}

export function addWarrantyIn(
  map: WarrantiesByAsociatie,
  asociatieId: string,
  warranty: Warranty,
): WarrantiesByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [warranty, ...current] };
}

export function migrateWarrantiesState(persisted: unknown): WarrantiesByAsociatie {
  const p = persisted as { byAsociatie?: WarrantiesByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_WARRANTIES] };
}
