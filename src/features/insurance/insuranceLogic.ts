import type { InsurancePolicy } from '@/shared/types/domain';
import { warrantyStatus, type WarrantyStatus } from '@/features/repairs/repairLogic';
import { DEMO_ASOCIATIE, DEMO_INSURANCE } from '@/shared/demo/demoData';
import { emptyArray } from '@/shared/lib/emptyArray';

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

// ── Per-asociatie insurance policy catalog ───────────────────────────────────

export type InsuranceByAsociatie = Record<string, InsurancePolicy[]>;

const EMPTY_INSURANCE = emptyArray<InsurancePolicy>();

export function insuranceForAsociatie(map: InsuranceByAsociatie, asociatieId: string | null): InsurancePolicy[] {
  if (!asociatieId) return EMPTY_INSURANCE;
  return map[asociatieId] ?? EMPTY_INSURANCE;
}

export function seedInsurance(): InsuranceByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_INSURANCE] };
}

export function addInsuranceIn(map: InsuranceByAsociatie, asociatieId: string, policy: InsurancePolicy): InsuranceByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [policy, ...current] };
}

export function migrateInsuranceState(persisted: unknown): InsuranceByAsociatie {
  const p = persisted as { byAsociatie?: InsuranceByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_INSURANCE] };
}
