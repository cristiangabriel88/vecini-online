import type { PsiAsset } from '@/shared/types/domain';
import { warrantyStatus, type WarrantyStatus } from '@/features/repairs/repairLogic';
import { DEMO_ASOCIATIE, DEMO_PSI_ASSETS } from '@/shared/demo/demoData';

/** PSI check status: overdue (expired), due soon (expiring) or ok (active). */
export type PsiStatus = 'overdue' | 'due_soon' | 'ok';

/** Classify an asset by its next check date, reusing the shared date classifier. */
export function psiStatus(nextCheck: string, now: Date = new Date()): PsiStatus {
  const s: WarrantyStatus = warrantyStatus(nextCheck, now);
  if (s === 'expired') return 'overdue';
  if (s === 'expiring') return 'due_soon';
  return 'ok';
}

/** An asset needs a name and a parseable next-check date. */
export function isValidAsset(asset: string, nextCheck: string): boolean {
  return asset.trim().length > 0 && !Number.isNaN(new Date(nextCheck).getTime());
}

/** Sort assets by next check date ascending (most overdue first). */
export function sortByNextCheck(assets: PsiAsset[]): PsiAsset[] {
  return [...assets].sort(
    (a, b) => new Date(a.next_check).getTime() - new Date(b.next_check).getTime(),
  );
}

/** Count assets that are overdue or due soon — used by the comitet digest. */
export function countDue(assets: PsiAsset[], now: Date = new Date()): number {
  return assets.filter((a) => psiStatus(a.next_check, now) !== 'ok').length;
}

// ── Per-asociatie PSI asset catalog ─────────────────────────────────────────

export type PsiByAsociatie = Record<string, PsiAsset[]>;

const EMPTY_PSI: PsiAsset[] = [];

export function psiForAsociatie(map: PsiByAsociatie, asociatieId: string | null): PsiAsset[] {
  if (!asociatieId) return EMPTY_PSI;
  return map[asociatieId] ?? EMPTY_PSI;
}

export function seedPsiAssets(): PsiByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_PSI_ASSETS] };
}

export function addPsiIn(map: PsiByAsociatie, asociatieId: string, asset: PsiAsset): PsiByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [asset, ...current] };
}

export function markCheckedIn(map: PsiByAsociatie, asociatieId: string, id: string, rollForwardDays: number): PsiByAsociatie {
  const current = map[asociatieId] ?? [];
  const updated = current.map((a) =>
    a.id === id
      ? { ...a, next_check: new Date(Date.now() + rollForwardDays * 86_400_000).toISOString().slice(0, 10) }
      : a,
  );
  return { ...map, [asociatieId]: updated };
}

export function migratePsiState(persisted: unknown): PsiByAsociatie {
  const p = persisted as { byAsociatie?: PsiByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_PSI_ASSETS] };
}
