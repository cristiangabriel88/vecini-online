import { beforeEach, describe, expect, it } from 'vitest';
import { useProjectsStore } from '@/features/projects/projectsStore';
import { hydrateProjects, addProjectLive, setProjectStatusLive } from '@/features/projects/projectsApi';
import { projectsForAsociatie, seedProjects } from '@/features/projects/projectsLogic';
import { DEMO_ASOCIATIE, DEMO_PROJECTS } from '@/shared/demo/demoData';
import type { Project } from '@/shared/types/domain';

const ASOC = DEMO_ASOCIATIE.id;

function makeProject(overrides?: Partial<Project>): Project {
  return {
    id: `pr-test-${Date.now()}`,
    asociatie_id: ASOC,
    title: 'Reparație scară',
    description: '',
    contractor: '',
    status: 'planificat',
    budget_allocated: 10000,
    budget_spent: 0,
    phases: [],
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  useProjectsStore.setState({ byAsociatie: seedProjects(), fetchError: null });
});

describe('hydrateProjects', () => {
  it('is a no-op when Supabase is not configured', async () => {
    const before = useProjectsStore.getState().byAsociatie;
    await hydrateProjects(ASOC);
    expect(useProjectsStore.getState().byAsociatie).toBe(before);
    expect(useProjectsStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useProjectsStore.getState().byAsociatie;
    await hydrateProjects('');
    expect(useProjectsStore.getState().byAsociatie).toBe(before);
  });
});

describe('addProjectLive', () => {
  it('appends the project synchronously', () => {
    const before = projectsForAsociatie(useProjectsStore.getState().byAsociatie, ASOC).length;
    const project = makeProject({ id: 'pr-test-add' });
    addProjectLive(ASOC, project);
    const after = projectsForAsociatie(useProjectsStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after.some((p) => p.id === 'pr-test-add')).toBe(true);
  });

  it('preserves demo projects after adding one', () => {
    addProjectLive(ASOC, makeProject());
    const after = projectsForAsociatie(useProjectsStore.getState().byAsociatie, ASOC);
    const demoIds = DEMO_PROJECTS.map((p) => p.id);
    expect(after.filter((p) => demoIds.includes(p.id))).toHaveLength(DEMO_PROJECTS.length);
  });
});

describe('setProjectStatusLive', () => {
  it('updates the project status in the store', () => {
    setProjectStatusLive(ASOC, 'pr-1', 'in_curs');
    const after = projectsForAsociatie(useProjectsStore.getState().byAsociatie, ASOC);
    expect(after.find((p) => p.id === 'pr-1')?.status).toBe('in_curs');
  });
});
