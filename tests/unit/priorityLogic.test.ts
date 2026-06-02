import { describe, expect, it } from 'vitest';
import {
  isValidProject,
  moveDown,
  moveUp,
  sortByRank,
  applyReorder,
  canManagePriorities,
  seedPriorities,
  prioritiesForAsociatie,
  migratePrioritiesState,
} from '@/features/priorities/priorityLogic';
import { DEMO_ASOCIATIE, DEMO_PRIORITIES } from '@/shared/demo/demoData';
import type { PriorityProject } from '@/shared/types/domain';

const ASOC = DEMO_ASOCIATIE.id;

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

describe('applyReorder', () => {
  it('moves active item to the target position (drag from bottom to top)', () => {
    const result = applyReorder(projects, 'c', 'a');
    expect(sortByRank(result).map((p) => p.id)).toEqual(['c', 'a', 'b']);
  });
  it('moves active item to a middle position', () => {
    const result = applyReorder(projects, 'a', 'c');
    expect(sortByRank(result).map((p) => p.id)).toEqual(['b', 'c', 'a']);
  });
  it('is a no-op when active and over are the same', () => {
    expect(applyReorder(projects, 'b', 'b')).toBe(projects);
  });
  it('re-numbers ranks 1..n after reorder', () => {
    const result = applyReorder(projects, 'c', 'a');
    expect(sortByRank(result).map((p) => p.rank)).toEqual([1, 2, 3]);
  });
  it('returns original when an id is not found', () => {
    expect(applyReorder(projects, 'a', 'z')).toBe(projects);
  });
});

describe('canManagePriorities', () => {
  it('allows admin, presedinte, comitet', () => {
    expect(canManagePriorities('admin')).toBe(true);
    expect(canManagePriorities('presedinte')).toBe(true);
    expect(canManagePriorities('comitet')).toBe(true);
  });
  it('rejects proprietar, locatar, null', () => {
    expect(canManagePriorities('proprietar')).toBe(false);
    expect(canManagePriorities('locatar')).toBe(false);
    expect(canManagePriorities(null)).toBe(false);
  });
});

describe('per-asociație model', () => {
  it('seedPriorities seeds the demo asociație from DEMO_PRIORITIES', () => {
    const seed = seedPriorities();
    expect(seed[ASOC]).toBeDefined();
    expect(seed[ASOC].projects).toHaveLength(DEMO_PRIORITIES.length);
    expect(seed[ASOC].projects[0].rank).toBe(1);
  });

  it('prioritiesForAsociatie returns empty catalog for unknown id', () => {
    const cat = prioritiesForAsociatie(seedPriorities(), 'no-such-id');
    expect(cat.projects).toHaveLength(0);
  });

  it('prioritiesForAsociatie returns empty catalog for null', () => {
    expect(prioritiesForAsociatie({}, null).projects).toHaveLength(0);
  });

  it('migratePrioritiesState preserves non-demo asociatii and reseeds demo', () => {
    const other = {
      projects: [{ id: 'x', asociatie_id: 'other', title: 'X', description: '', rank: 1 }],
    };
    const persisted = { byAsociatie: { other, [ASOC]: { projects: [] } } };
    const result = migratePrioritiesState(persisted);
    expect(result['other']).toEqual(other);
    expect(result[ASOC].projects).toHaveLength(DEMO_PRIORITIES.length);
  });
});
