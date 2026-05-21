import { describe, expect, it } from 'vitest';
import { isValidPage, searchPages, slugify, sortPages } from '@/features/wiki/wikiLogic';
import type { WikiPage } from '@/shared/types/domain';

const base = { asociatie_id: 'a', updated_at: '2026-05-01T00:00:00Z' };

const pages: WikiPage[] = [
  { ...base, id: '1', slug: 'lift', title: 'Lift blocat', body_md: 'apasă alarma' },
  { ...base, id: '2', slug: 'apa', title: 'Închidere apă', body_md: 'robinet în subsol' },
  { ...base, id: '3', slug: 'curent', title: 'Cădere curent', body_md: 'tabloul electric' },
];

describe('isValidPage', () => {
  it('requires a title and a body', () => {
    expect(isValidPage('Lift', 'corp')).toBe(true);
    expect(isValidPage(' ', 'corp')).toBe(false);
    expect(isValidPage('Lift', '  ')).toBe(false);
  });
});

describe('slugify', () => {
  it('produces an accent-free, dashed slug', () => {
    expect(slugify('Închidere apă')).toBe('inchidere-apa');
    expect(slugify('  Cădere   curent!! ')).toBe('cadere-curent');
  });
});

describe('searchPages', () => {
  it('matches title or body accent-insensitively', () => {
    expect(searchPages(pages, 'inchidere').map((p) => p.id)).toEqual(['2']);
    expect(searchPages(pages, 'electric').map((p) => p.id)).toEqual(['3']);
  });
  it('returns all on empty query', () => {
    expect(searchPages(pages, '')).toHaveLength(3);
  });
});

describe('sortPages', () => {
  it('orders alphabetically by title', () => {
    expect(sortPages(pages).map((p) => p.title)).toEqual([
      'Cădere curent',
      'Închidere apă',
      'Lift blocat',
    ]);
  });
});
