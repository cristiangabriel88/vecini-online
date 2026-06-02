import { describe, expect, it } from 'vitest';
import {
  rankIdeas,
  topIdeas,
  isPromoted,
  canManageIdeas,
  newIdea,
  addIdeaIn,
  seedIdeas,
  ideasForAsociatie,
  migrateIdeasState,
  PROMOTION_COUNT,
} from '@/features/ideas/ideaLogic';
import type { Idea } from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_IDEAS } from '@/shared/demo/demoData';

function idea(id: string, votes: number, status: Idea['status'], created: string): Idea {
  return { id, asociatie_id: 'a', author_user_id: 'u', author_name: 'X', title: id, body: '', status, votes, created_at: created };
}

const ideas: Idea[] = [
  idea('a', 5, 'in_discutie', '2026-05-01T00:00:00Z'),
  idea('b', 9, 'in_discutie', '2026-05-02T00:00:00Z'),
  idea('c', 9, 'in_discutie', '2026-05-05T00:00:00Z'),
  idea('d', 30, 'implementat', '2026-04-01T00:00:00Z'),
];

describe('idea ranking', () => {
  it('ranks by votes desc then recency', () => {
    expect(rankIdeas(ideas).map((i) => i.id)).toEqual(['d', 'c', 'b', 'a']);
  });

  it('promotes only open ideas, limited to N', () => {
    expect(topIdeas(ideas, 2).map((i) => i.id)).toEqual(['c', 'b']);
    expect(topIdeas(ideas).every((i) => i.status === 'in_discutie')).toBe(true);
  });
});

describe('isPromoted', () => {
  it('returns true for top-N in-discutie ideas', () => {
    expect(isPromoted(idea('c', 9, 'in_discutie', '2026-05-05T00:00:00Z'), ideas, 2)).toBe(true);
    expect(isPromoted(idea('b', 9, 'in_discutie', '2026-05-02T00:00:00Z'), ideas, 2)).toBe(true);
  });

  it('returns false when outside the top-N cutoff', () => {
    expect(isPromoted(idea('a', 5, 'in_discutie', '2026-05-01T00:00:00Z'), ideas, 2)).toBe(false);
  });

  it('returns false for non-in-discutie ideas regardless of votes', () => {
    expect(isPromoted(idea('d', 30, 'implementat', '2026-04-01T00:00:00Z'), ideas, 10)).toBe(false);
  });

  it(`PROMOTION_COUNT default is ${PROMOTION_COUNT}`, () => {
    const manyIdeas = Array.from({ length: 15 }, (_, k) =>
      idea(`x${k}`, 15 - k, 'in_discutie', `2026-05-${String(k + 1).padStart(2, '0')}T00:00:00Z`),
    );
    const promoted = manyIdeas.filter((i) => isPromoted(i, manyIdeas));
    expect(promoted).toHaveLength(PROMOTION_COUNT);
  });
});

describe('canManageIdeas', () => {
  it('grants management to admin/presedinte/comitet', () => {
    expect(canManageIdeas('admin')).toBe(true);
    expect(canManageIdeas('presedinte')).toBe(true);
    expect(canManageIdeas('comitet')).toBe(true);
  });

  it('denies management to residents and null', () => {
    expect(canManageIdeas('proprietar')).toBe(false);
    expect(canManageIdeas('locatar')).toBe(false);
    expect(canManageIdeas(null)).toBe(false);
  });
});

describe('newIdea', () => {
  it('builds a valid idea object with status in_discutie and 1 vote', () => {
    const now = new Date('2026-06-03T10:00:00Z');
    const i = newIdea({ title: 'Test', body: 'Detalii' }, 'asoc-1', 'usr-1', 'Ion Pop', now);
    expect(i.title).toBe('Test');
    expect(i.body).toBe('Detalii');
    expect(i.asociatie_id).toBe('asoc-1');
    expect(i.author_user_id).toBe('usr-1');
    expect(i.author_name).toBe('Ion Pop');
    expect(i.status).toBe('in_discutie');
    expect(i.votes).toBe(1);
    expect(i.created_at).toBe(now.toISOString());
  });
});

describe('addIdeaIn', () => {
  it('prepends the idea to the catalog', () => {
    const cat = { items: [idea('old', 5, 'in_discutie', '2026-05-01T00:00:00Z')] };
    const newI = idea('new', 1, 'in_discutie', '2026-06-03T00:00:00Z');
    const updated = addIdeaIn(cat, newI);
    expect(updated.items[0].id).toBe('new');
    expect(updated.items).toHaveLength(2);
  });
});

describe('per-asociatie catalog', () => {
  it('seedIdeas populates the demo asociatie', () => {
    const state = seedIdeas();
    expect(state[DEMO_ASOCIATIE.id]).toBeDefined();
    expect(state[DEMO_ASOCIATIE.id].items).toHaveLength(DEMO_IDEAS.length);
  });

  it('ideasForAsociatie returns empty catalog for unknown id', () => {
    const state = seedIdeas();
    const cat = ideasForAsociatie(state, 'unknown');
    expect(cat.items).toHaveLength(0);
  });

  it('ideasForAsociatie returns empty catalog for null', () => {
    const state = seedIdeas();
    expect(ideasForAsociatie(state, null).items).toHaveLength(0);
  });

  it('migrateIdeasState preserves non-demo asociatii and reseeds demo', () => {
    const other = idea('x', 1, 'in_discutie', '2026-06-01T00:00:00Z');
    const persisted = {
      byAsociatie: {
        'other-asoc': { items: [other] },
        [DEMO_ASOCIATIE.id]: { items: [] },
      },
    };
    const migrated = migrateIdeasState(persisted);
    expect(migrated['other-asoc'].items).toHaveLength(1);
    expect(migrated[DEMO_ASOCIATIE.id].items).toHaveLength(DEMO_IDEAS.length);
  });
});
