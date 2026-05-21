import { describe, expect, it } from 'vitest';
import { countDue, isValidAsset, psiStatus, sortByNextCheck } from '@/features/psi/psiLogic';
import type { PsiAsset } from '@/shared/types/domain';

const NOW = new Date('2026-05-22T09:00:00Z');
const base = { asociatie_id: 'a', kind: 'Stingător', location: null };

const assets: PsiAsset[] = [
  { ...base, id: 'overdue', asset: 'Stingătoare', next_check: '2026-05-10' },
  { ...base, id: 'soon', asset: 'Hidranți', next_check: '2026-06-05' },
  { ...base, id: 'ok', asset: 'Instalație', next_check: '2027-05-01' },
];

describe('psiStatus', () => {
  it('maps the warranty classifier to PSI states', () => {
    expect(psiStatus('2026-05-10', NOW)).toBe('overdue');
    expect(psiStatus('2026-06-05', NOW)).toBe('due_soon');
    expect(psiStatus('2027-05-01', NOW)).toBe('ok');
  });
});

describe('isValidAsset', () => {
  it('requires a name and a parseable date', () => {
    expect(isValidAsset('Stingătoare', '2026-06-01')).toBe(true);
    expect(isValidAsset('  ', '2026-06-01')).toBe(false);
    expect(isValidAsset('Stingătoare', 'nope')).toBe(false);
  });
});

describe('sortByNextCheck / countDue', () => {
  it('sorts soonest first and counts overdue + due-soon', () => {
    expect(sortByNextCheck(assets).map((a) => a.id)).toEqual(['overdue', 'soon', 'ok']);
    expect(countDue(assets, NOW)).toBe(2);
  });
});
