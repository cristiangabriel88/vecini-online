import type { PsiAsset } from '@/shared/types/domain';
import { warrantyStatus, type WarrantyStatus } from '@/features/repairs/repairLogic';

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
