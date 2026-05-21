import { describe, expect, it } from 'vitest';
import {
  contractStatus,
  countContractAlerts,
  isValidSupplier,
  sortByContractEnd,
} from '@/features/suppliers/supplierLogic';
import type { Supplier } from '@/shared/types/domain';

const NOW = new Date('2026-05-22T09:00:00Z');
const base = { asociatie_id: 'a', contact: null, account_number: null, contract_start: null, last_invoice_date: null };

const suppliers: Supplier[] = [
  { ...base, id: '1', name: 'Apa Nova', kind: 'apă', contract_end: '2027-01-01' },
  { ...base, id: '2', name: 'Distrigaz', kind: 'gaz', contract_end: '2026-06-15' },
  { ...base, id: '3', name: 'Salubris', kind: 'salubritate', contract_end: '2026-05-10' },
  { ...base, id: '4', name: 'Internet', kind: 'internet', contract_end: null },
];

describe('contractStatus', () => {
  it('classifies relative to now', () => {
    expect(contractStatus('2027-01-01', NOW)).toBe('active');
    expect(contractStatus('2026-06-15', NOW)).toBe('expiring');
    expect(contractStatus('2026-05-10', NOW)).toBe('expired');
    expect(contractStatus(null, NOW)).toBe('none');
  });
});

describe('isValidSupplier', () => {
  it('requires name and kind', () => {
    expect(isValidSupplier('Apa Nova', 'apă')).toBe(true);
    expect(isValidSupplier('', 'apă')).toBe(false);
    expect(isValidSupplier('Apa Nova', ' ')).toBe(false);
  });
});

describe('sortByContractEnd', () => {
  it('orders soonest first, undated last', () => {
    expect(sortByContractEnd(suppliers).map((s) => s.id)).toEqual(['3', '2', '1', '4']);
  });
});

describe('countContractAlerts', () => {
  it('counts expired and expiring contracts', () => {
    expect(countContractAlerts(suppliers, NOW)).toBe(2);
  });
});
