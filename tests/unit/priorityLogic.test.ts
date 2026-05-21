import { describe, expect, it } from 'vitest';
import { isValidProject, moveDown, moveUp, sortByRank } from '@/features/priorities/priorityLogic';
import type { PriorityProject } from '@/shared/types/domain';

const projects: PriorityProject[] = [
  { id: 'a', asociatie_id: 'x', title: 'Acoperiș', description: '', rank: 1 },
  { id: 'b', asociatie_id: 'x', title: 'Fațadă', description: '', rank: 2 },
  { id: 'c', asociatie_id: 'x', title: 'Lift', description: '', rank: 3 },
];

describe('isValidProject', () => {
  it('requires a title', () => {
    expect(isValidProject('Lift')).toBe(true);
    expect(isValidProject('  ')).toBe(false);
  });
});

describe('sortByRank', () => {
  it('orders by rank ascending', () => {
    const shuffled = [projects[2], projects[0], projects[1]];
    expect(sortByRank(shuffled).map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('moveUp', () => {
  it('swaps a project with the one above and re-numbers', () => {
    const next = moveUp(projects, 'c');
    expect(sortByRank(next).map((p) => p.id)).toEqual(['a', 'c', 'b']);
    expect(sortByRank(next).map((p) => p.rank)).toEqual([1, 2, 3]);
  });
  it('is a no-op at the top', () => {
    expect(moveUp(projects, 'a')).toBe(projects);
  });
});

describe('moveDown', () => {
  it('swaps a project with the one below', () => {
    const next = moveDown(projects, 'a');
    expect(sortByRank(next).map((p) => p.id)).toEqual(['b', 'a', 'c']);
  });
  it('is a no-op at the bottom', () => {
    expect(moveDown(projects, 'c')).toBe(projects);
  });
});
