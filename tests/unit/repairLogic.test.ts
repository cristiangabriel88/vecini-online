import { describe, expect, it } from 'vitest';
import { warrantyStatus, searchRepairs, WARRANTY_ALERT_DAYS } from '@/features/repairs/repairLogic';
import type { RepairRecord } from '@/shared/types/domain';

const now = new Date('2026-05-21T00:00:00Z');

const records: RepairRecord[] = [
  { id: '1', asociatie_id: 'a', system: 'apa', title: 'Înlocuire pompă hidrofor', description: 'pompa principală', contractor: 'HidroServ', cost: 4200, warranty_until: '2027-09-15', performed_at: '2025-09-15', created_at: '2025-09-16T00:00:00Z' },
  { id: '2', asociatie_id: 'a', system: 'lift', title: 'Revizie lift', description: 'cabluri', contractor: 'Lift Expert', cost: 6800, warranty_until: '2026-06-10', performed_at: '2025-06-10', created_at: '2025-06-11T00:00:00Z' },
  { id: '3', asociatie_id: 'a', system: 'electric', title: 'Tablou parter', description: 'siguranțe', contractor: null, cost: null, warranty_until: '2024-11-01', performed_at: '2023-11-01', created_at: '2023-11-02T00:00:00Z' },
];

describe('warrantyStatus', () => {
  it('classifies none/active/expiring/expired around the alert window', () => {
    expect(warrantyStatus(null, now)).toBe('none');
    expect(warrantyStatus('2027-09-15', now)).toBe('active');
    expect(warrantyStatus('2026-06-10', now)).toBe('expiring'); // 20 days out, within 30
    expect(warrantyStatus('2024-11-01', now)).toBe('expired');
    const edge = new Date(now.getTime() + WARRANTY_ALERT_DAYS * 86_400_000).toISOString();
    expect(warrantyStatus(edge, now)).toBe('expiring');
  });
});

describe('searchRepairs', () => {
  it('filters by query (diacritic-insensitive) and system', () => {
    expect(searchRepairs(records, 'pompa')).toHaveLength(1);
    expect(searchRepairs(records, '', 'lift').map((r) => r.id)).toEqual(['2']);
    expect(searchRepairs(records, 'inexistent')).toHaveLength(0);
    expect(searchRepairs(records, '')).toHaveLength(3);
  });
});
