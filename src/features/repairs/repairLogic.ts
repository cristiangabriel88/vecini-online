import type { RepairRecord } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';

export type WarrantyStatus = 'none' | 'expired' | 'expiring' | 'active';

/** Days before warranty expiry at which we surface an "expiring soon" alert. */
export const WARRANTY_ALERT_DAYS = 30;

/** Classify a repair's warranty relative to `now`. */
export function warrantyStatus(
  warrantyUntil: string | null,
  now: Date = new Date(),
): WarrantyStatus {
  if (!warrantyUntil) return 'none';
  const end = new Date(warrantyUntil).getTime();
  const today = now.getTime();
  if (end < today) return 'expired';
  const days = (end - today) / 86_400_000;
  return days <= WARRANTY_ALERT_DAYS ? 'expiring' : 'active';
}

/** Filter repair records by free-text query and optional system. */
export function searchRepairs(
  records: RepairRecord[],
  query: string,
  system: RepairRecord['system'] | 'all' = 'all',
): RepairRecord[] {
  const q = normalizeSearch(query.trim());
  return records.filter((r) => {
    if (system !== 'all' && r.system !== system) return false;
    if (!q) return true;
    return normalizeSearch(`${r.title} ${r.description} ${r.contractor ?? ''}`).includes(q);
  });
}
