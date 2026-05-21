import { describe, expect, it } from 'vitest';
import { isValidReport, nextStatus, recentReports } from '@/features/visitors/visitorLogic';
import type { VisitorReport } from '@/shared/types/domain';

const base = { asociatie_id: 'a', reporter_user_id: 'u', reporter_name: 'Andrei', photo_path: null };

const reports: VisitorReport[] = [
  { ...base, id: '1', note: 'Persoană suspectă la interfon', status: 'rezolvat', created_at: '2026-05-20T21:00:00Z' },
  { ...base, id: '2', note: 'Mașină necunoscută în față', status: 'nou', created_at: '2026-05-18T14:00:00Z' },
  { ...base, id: '3', note: 'Curier fără colete', status: 'nou', created_at: '2026-05-19T09:00:00Z' },
];

describe('isValidReport', () => {
  it('requires a non-trivial note', () => {
    expect(isValidReport('Sună la interfon')).toBe(true);
    expect(isValidReport('   ')).toBe(false);
    expect(isValidReport('ab')).toBe(false);
  });
});

describe('nextStatus', () => {
  it('cycles nou → cunoscut → rezolvat → nou', () => {
    expect(nextStatus('nou')).toBe('cunoscut');
    expect(nextStatus('cunoscut')).toBe('rezolvat');
    expect(nextStatus('rezolvat')).toBe('nou');
  });
});

describe('recentReports', () => {
  it('floats open reports above resolved ones, newest first within each group', () => {
    expect(recentReports(reports).map((r) => r.id)).toEqual(['3', '2', '1']);
  });

  it('does not mutate the input array', () => {
    const copy = [...reports];
    recentReports(reports);
    expect(reports).toEqual(copy);
  });
});
