import { describe, expect, it } from 'vitest';
import { countExpiring, isValidPolicy, policyStatus, sortByExpiry } from '@/features/insurance/insuranceLogic';
import type { InsurancePolicy } from '@/shared/types/domain';

const NOW = new Date('2026-05-22T09:00:00Z');

const policies: InsurancePolicy[] = [
  { id: 'expired', asociatie_id: 'a', insurer: 'X', policy_number: '1', expires_at: '2026-05-10', document_path: null },
  { id: 'soon', asociatie_id: 'a', insurer: 'Y', policy_number: '2', expires_at: '2026-06-05', document_path: null },
  { id: 'active', asociatie_id: 'a', insurer: 'Z', policy_number: '3', expires_at: '2027-05-01', document_path: null },
];

describe('policyStatus', () => {
  it('classifies expiry windows', () => {
    expect(policyStatus('2026-05-10', NOW)).toBe('expired');
    expect(policyStatus('2026-06-05', NOW)).toBe('expiring');
    expect(policyStatus('2027-05-01', NOW)).toBe('active');
  });
});

describe('isValidPolicy', () => {
  it('requires insurer, number and a parseable date', () => {
    expect(isValidPolicy('Allianz', 'POL-1', '2027-01-01')).toBe(true);
    expect(isValidPolicy('', 'POL-1', '2027-01-01')).toBe(false);
    expect(isValidPolicy('Allianz', '', '2027-01-01')).toBe(false);
    expect(isValidPolicy('Allianz', 'POL-1', 'nope')).toBe(false);
  });
});

describe('sortByExpiry / countExpiring', () => {
  it('sorts soonest first and counts non-active policies', () => {
    expect(sortByExpiry(policies).map((p) => p.id)).toEqual(['expired', 'soon', 'active']);
    expect(countExpiring(policies, NOW)).toBe(2);
  });
});
