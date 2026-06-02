import { describe, expect, it } from 'vitest';
import {
  addPetitionIn,
  canManagePetitions,
  isThresholdReached,
  isValidPetition,
  migratePetitionsState,
  newPetition,
  petitionsForAsociatie,
  progress,
  seedPetitions,
  sortPetitions,
  thresholdCount,
} from '@/features/petitions/petitionLogic';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';
import type { Petition } from '@/shared/types/domain';

const base = {
  asociatie_id: 'a',
  author_user_id: 'u',
  author_name: 'Elena',
  body: 'corp text',
  threshold_percent: 25,
  status: 'deschisa',
};

const p = (over: Partial<Petition>): Petition => ({
  ...base,
  id: 'x',
  title: 'Titlu petiție',
  created_at: '2026-05-01T00:00:00Z',
  signatures: 0,
  total_apartments: 20,
  ...over,
});

describe('isValidPetition', () => {
  it('requires a title and a body', () => {
    expect(isValidPetition('Titlu', 'corp text')).toBe(true);
    expect(isValidPetition('ab', 'corp text')).toBe(false);
    expect(isValidPetition('Titlu', 'x')).toBe(false);
  });
});

describe('thresholdCount / isThresholdReached', () => {
  it('rounds the percentage up and compares signatures', () => {
    expect(thresholdCount(p({ total_apartments: 20 }))).toBe(5); // ceil(25% of 20)
    expect(thresholdCount(p({ total_apartments: 21 }))).toBe(6); // ceil(5.25)
    expect(isThresholdReached(p({ signatures: 4, total_apartments: 20 }))).toBe(false);
    expect(isThresholdReached(p({ signatures: 5, total_apartments: 20 }))).toBe(true);
  });
});

describe('progress', () => {
  it('is the ratio of signatures to target, clamped to 1', () => {
    expect(progress(p({ signatures: 0, total_apartments: 20 }))).toBe(0);
    expect(progress(p({ signatures: 10, total_apartments: 20 }))).toBe(1);
  });
});

describe('sortPetitions', () => {
  it('orders newest first', () => {
    const list = [
      p({ id: 'old', created_at: '2026-05-01T00:00:00Z' }),
      p({ id: 'new', created_at: '2026-05-10T00:00:00Z' }),
    ];
    expect(sortPetitions(list).map((x) => x.id)).toEqual(['new', 'old']);
  });
});

describe('canManagePetitions', () => {
  it('allows admin/presedinte/comitet, blocks others', () => {
    expect(canManagePetitions('admin')).toBe(true);
    expect(canManagePetitions('presedinte')).toBe(true);
    expect(canManagePetitions('comitet')).toBe(true);
    expect(canManagePetitions('proprietar')).toBe(false);
    expect(canManagePetitions('locatar')).toBe(false);
    expect(canManagePetitions(null)).toBe(false);
  });
});

describe('seedPetitions', () => {
  it('seeds the demo asociație with at least one petition', () => {
    const map = seedPetitions();
    expect(map[DEMO_ASOCIATIE.id]).toBeDefined();
    expect(map[DEMO_ASOCIATIE.id].items.length).toBeGreaterThan(0);
  });
});

describe('petitionsForAsociatie', () => {
  it('returns empty catalog for unknown or null asociație', () => {
    const map = seedPetitions();
    expect(petitionsForAsociatie(map, null).items).toHaveLength(0);
    expect(petitionsForAsociatie(map, 'unknown').items).toHaveLength(0);
  });

  it('returns the seeded catalog for the demo asociație', () => {
    const map = seedPetitions();
    expect(petitionsForAsociatie(map, DEMO_ASOCIATIE.id).items.length).toBeGreaterThan(0);
  });
});

describe('migratePetitionsState', () => {
  it('reseeds the demo asociație and preserves other entries', () => {
    const custom = p({ id: 'custom-1', asociatie_id: 'other-asoc' });
    const persisted = {
      byAsociatie: {
        'other-asoc': { items: [custom] },
        [DEMO_ASOCIATIE.id]: { items: [] },
      },
    };
    const result = migratePetitionsState(persisted);
    expect(result['other-asoc'].items).toHaveLength(1);
    expect(result[DEMO_ASOCIATIE.id].items.length).toBeGreaterThan(0);
  });

  it('handles null/undefined persisted state gracefully', () => {
    const result = migratePetitionsState(null);
    expect(result[DEMO_ASOCIATIE.id].items.length).toBeGreaterThan(0);
  });
});

describe('newPetition', () => {
  it('builds a valid petition with trimmed input and 1 initial signature', () => {
    const petition = newPetition(
      { title: '  Titlu  ', body: '  Corp  ' },
      'asoc-1',
      'u-1',
      'Ion',
      20,
    );
    expect(petition.title).toBe('Titlu');
    expect(petition.body).toBe('Corp');
    expect(petition.signatures).toBe(1);
    expect(petition.threshold_percent).toBe(25);
    expect(petition.total_apartments).toBe(20);
    expect(petition.status).toBe('deschisa');
  });
});

describe('addPetitionIn', () => {
  it('prepends the new petition to the catalog', () => {
    const catalog = { items: [p({ id: 'old' })] };
    const added = addPetitionIn(catalog, p({ id: 'new' }));
    expect(added.items[0].id).toBe('new');
    expect(added.items).toHaveLength(2);
  });
});
