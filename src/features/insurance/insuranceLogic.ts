import type { InsurancePolicy } from '@/shared/types/domain';
import { warrantyStatus, type WarrantyStatus } from '@/features/repairs/repairLogic';

/** Policy status: expired, expiring soon (renewal due) or active. */
export type PolicyStatus = 'expired' | 'expiring' | 'active';

/** Classify a policy by its expiry date, reusing the shared date classifier. */
export function policyStatus(expiresAt: string, now: Date = new Date()): PolicyStatus {
  const s: WarrantyStatus = warrantyStatus(expiresAt, now);
  return s === 'none' ? 'active' : s;
}

/** A policy needs an insurer, a number and a parseable expiry date. */
export function isValidPolicy(insurer: string, policyNumber: string, expiresAt: string): boolean {
  return (
    insurer.trim().length > 0 &&
    policyNumber.trim().length > 0 &&
    !Number.isNaN(new Date(expiresAt).getTime())
  );
}

/** Sort policies by expiry date ascending (soonest first). */
export function sortByExpiry(policies: InsurancePolicy[]): InsurancePolicy[] {
  return [...policies].sort(
    (a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime(),
  );
}

/** Count policies that are expired or expiring soon — used by the renewal alert. */
export function countExpiring(policies: InsurancePolicy[], now: Date = new Date()): number {
  return policies.filter((p) => policyStatus(p.expires_at, now) !== 'active').length;
}
