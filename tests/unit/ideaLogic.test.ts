import { describe, expect, it } from 'vitest';
import { rankIdeas, topIdeas } from '@/features/ideas/ideaLogic';
import type { Idea } from '@/shared/types/domain';

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
