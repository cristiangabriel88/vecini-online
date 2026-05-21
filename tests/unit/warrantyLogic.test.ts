import { describe, expect, it } from 'vitest';
import {
  computeExpiry,
  countAlerts,
  isValidWarranty,
  sortByExpiry,
} from '@/features/warranties/warrantyLogic';
import type { Warranty } from '@/shared/types/domain';

const mk = (id: string, expires_at: string): Warranty => ({
  id,
  asociatie_id: 'a',
  asset: `Asset ${id}`,
  purchased_at: '2024-01-01',
  warranty_months: 24,
  expires_at,
  document_path: null,
});

describe('computeExpiry', () => {
  it('adds the warranty months to the purchase date', () => {
    expect(computeExpiry('2025-09-15', 24)).toBe('2027-09-15');
    expect(computeExpiry('2026-01-31', 1)).toBe('2026-02-28');
  });
});

describe('isValidWarranty', () => {
  it('requires an asset, a date and a positive duration', () => {
    expect(isValidWarranty('Lift', '2025-01-01', 24)).toBe(true);
    expect(isValidWarranty('', '2025-01-01', 24)).toBe(false);
    expect(isValidWarranty('Lift', '', 24)).toBe(false);
    expect(isValidWarranty('Lift', '2025-01-01', 0)).toBe(false);
  });
});

describe('sortByExpiry', () => {
  it('orders soonest expiry first without mutating input', () => {
    const input = [mk('a', '2027-01-01'), mk('b', '2025-01-01'), mk('c', '2026-01-01')];
    expect(sortByExpiry(input).map((w) => w.id)).toEqual(['b', 'c', 'a']);
    expect(input.map((w) => w.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('countAlerts', () => {
  it('counts expired and expiring-soon warranties', () => {
    const now = new Date('2026-05-22T00:00:00Z');
    const list = [
      mk('expired', '2026-01-01'),
      mk('expiring', '2026-06-10'),
      mk('active', '2027-01-01'),
    ];
    expect(countAlerts(list, now)).toBe(2);
  });
});
