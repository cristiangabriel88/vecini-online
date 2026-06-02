import { beforeEach, describe, expect, it } from 'vitest';
import { usePriorityStore } from '@/features/priorities/priorityStore';
import { hydratePriorities, addPriorityProject, saveRanking } from '@/features/priorities/priorityApi';
import { prioritiesForAsociatie, seedPriorities } from '@/features/priorities/priorityLogic';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';
import type { PriorityProject } from '@/shared/types/domain';

// priorityApi offline-path tests (T193).
// Live-path tests require a real Supabase backend; the offline path
// (isSupabaseConfigured === false) is what CI exercises here. Key contracts:
//   - hydratePriorities: no-op when not configured / empty id (store untouched)
//   - addPriorityProject: adds to the store synchronously, offline-safe
//   - saveRanking: applies the reordered list to the store synchronously

const ASOC = DEMO_ASOCIATIE.id;

function makeProject(rank: number): PriorityProject {
  return {
    id: `pr-test-${rank}`,
    asociatie_id: ASOC,
    title: `Test project ${rank}`,
    description: '',
    rank,
  };
}

beforeEach(() => {
  usePriorityStore.setState({ byAsociatie: seedPriorities(), fetchError: null });
});

describe('hydratePriorities', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = usePriorityStore.getState().byAsociatie;
    await hydratePriorities(ASOC);
    expect(usePriorityStore.getState().byAsociatie).toBe(before);
    expect(usePriorityStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = usePriorityStore.getState().byAsociatie;
    await hydratePriorities('');
    expect(usePriorityStore.getState().byAsociatie).toBe(before);
  });
});

describe('addPriorityProject', () => {
  it('adds a project to the store synchronously', () => {
    const before = prioritiesForAsociatie(usePriorityStore.getState().byAsociatie, ASOC).projects.length;
    addPriorityProject(ASOC, makeProject(before + 1));
    const after = prioritiesForAsociatie(usePriorityStore.getState().byAsociatie, ASOC).projects.length;
    expect(after).toBe(before + 1);
  });

  it('stores the correct title and rank', () => {
    const project = makeProject(99);
    addPriorityProject(ASOC, project);
    const found = prioritiesForAsociatie(usePriorityStore.getState().byAsociatie, ASOC).projects.find(
      (p) => p.id === project.id,
    );
    expect(found?.title).toBe(project.title);
    expect(found?.rank).toBe(99);
  });
});

describe('saveRanking', () => {
  it('applies the new project order to the store synchronously', () => {
    const current = prioritiesForAsociatie(usePriorityStore.getState().byAsociatie, ASOC).projects;
    const reversed = [...current].reverse().map((p, i) => ({ ...p, rank: i + 1 }));
    saveRanking(ASOC, reversed, null);
    const stored = prioritiesForAsociatie(usePriorityStore.getState().byAsociatie, ASOC).projects;
    expect(stored.map((p) => p.id)).toEqual(reversed.map((p) => p.id));
  });

  it('no-op DB write when Supabase is not configured', () => {
    const before = usePriorityStore.getState().byAsociatie;
    const projects = prioritiesForAsociatie(before, ASOC).projects;
    saveRanking(ASOC, projects, null);
    expect(usePriorityStore.getState().fetchError).toBeNull();
  });
});
