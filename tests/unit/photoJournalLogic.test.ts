import { describe, expect, it } from 'vitest';
import {
  PHOTO_SWATCHES,
  filterByProject,
  groupByDate,
  isValidPhoto,
  swatchForIndex,
} from '@/features/photojournal/photoJournalLogic';
import type { ProjectPhoto } from '@/shared/types/domain';

const photo = (id: string, project_id: string, date: string, created_at: string): ProjectPhoto => ({
  id,
  asociatie_id: 'a',
  project_id,
  project_title: `Proiect ${project_id}`,
  date,
  caption: `Caption ${id}`,
  phase: '',
  swatch: PHOTO_SWATCHES[0],
  author_name: 'Tester',
  created_at,
});

describe('swatchForIndex', () => {
  it('cycles through the swatch palette', () => {
    expect(swatchForIndex(0)).toBe(PHOTO_SWATCHES[0]);
    expect(swatchForIndex(PHOTO_SWATCHES.length)).toBe(PHOTO_SWATCHES[0]);
    expect(swatchForIndex(1)).toBe(PHOTO_SWATCHES[1]);
  });
});

describe('isValidPhoto', () => {
  it('requires a 3+ char caption and a date', () => {
    expect(isValidPhoto('Schela montată', '2026-05-01')).toBe(true);
    expect(isValidPhoto('ab', '2026-05-01')).toBe(false);
    expect(isValidPhoto('Schela montată', '')).toBe(false);
  });
});

describe('filterByProject', () => {
  const photos = [photo('a', 'pr-1', '2026-05-01', 't1'), photo('b', 'pr-2', '2026-05-01', 't2')];

  it('returns everything for "all"', () => {
    expect(filterByProject(photos, 'all')).toHaveLength(2);
  });

  it('filters to a single project', () => {
    expect(filterByProject(photos, 'pr-2').map((p) => p.id)).toEqual(['b']);
  });
});

describe('groupByDate', () => {
  it('groups by day newest-first, with newest entry first within a day', () => {
    const photos = [
      photo('a', 'pr-1', '2026-05-01', '2026-05-01T08:00:00Z'),
      photo('b', 'pr-1', '2026-05-10', '2026-05-10T09:00:00Z'),
      photo('c', 'pr-1', '2026-05-01', '2026-05-01T10:00:00Z'),
    ];
    const groups = groupByDate(photos);
    expect(groups.map((g) => g.date)).toEqual(['2026-05-10', '2026-05-01']);
    expect(groups[1].photos.map((p) => p.id)).toEqual(['c', 'a']);
  });
});
