import { beforeEach, describe, expect, it } from 'vitest';
import { useGreenStore } from '@/features/greenspace/greenStore';
import { hydrateGreenTasks, addGreenTask, signUpForTask, releaseTask } from '@/features/greenspace/greenApi';
import { greenForAsociatie, seedGreenTasks } from '@/features/greenspace/greenLogic';
import { DEMO_ASOCIATIE, DEMO_GREEN_TASKS } from '@/shared/demo/demoData';
import type { GreenTask } from '@/shared/types/domain';

// greenApi offline-path tests (T215).
// Key contracts:
//   - hydrateGreenTasks: no-op when not configured / empty id
//   - addGreenTask: prepends synchronously, offline-safe
//   - signUpForTask / releaseTask: mutate volunteer fields, offline-safe

const ASOC = DEMO_ASOCIATIE.id;

function makeTask(overrides?: Partial<GreenTask>): GreenTask {
  return {
    id: `gt-test-${Date.now()}`,
    asociatie_id: ASOC,
    title: 'Curăț scara',
    week_start: '2026-07-01',
    volunteer_user_id: null,
    volunteer_name: null,
    ...overrides,
  };
}

beforeEach(() => {
  useGreenStore.setState({ byAsociatie: seedGreenTasks(), fetchError: null });
});

describe('hydrateGreenTasks', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useGreenStore.getState().byAsociatie;
    await hydrateGreenTasks(ASOC);
    expect(useGreenStore.getState().byAsociatie).toBe(before);
    expect(useGreenStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useGreenStore.getState().byAsociatie;
    await hydrateGreenTasks('');
    expect(useGreenStore.getState().byAsociatie).toBe(before);
  });
});

describe('addGreenTask', () => {
  it('prepends the task synchronously to the store', () => {
    const before = greenForAsociatie(useGreenStore.getState().byAsociatie, ASOC).length;
    const task = makeTask();
    addGreenTask(ASOC, task);
    const after = greenForAsociatie(useGreenStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe(task.id);
  });
});

describe('signUpForTask / releaseTask', () => {
  it('signUpForTask sets volunteer fields', () => {
    const task = DEMO_GREEN_TASKS.find((t) => t.volunteer_user_id === null)!;
    signUpForTask(ASOC, task.id, 'u-test', 'Test User');
    const stored = greenForAsociatie(useGreenStore.getState().byAsociatie, ASOC).find(
      (t) => t.id === task.id,
    )!;
    expect(stored.volunteer_user_id).toBe('u-test');
    expect(stored.volunteer_name).toBe('Test User');
  });

  it('releaseTask clears volunteer fields', () => {
    const task = DEMO_GREEN_TASKS.find((t) => t.volunteer_user_id !== null)!;
    releaseTask(ASOC, task.id);
    const stored = greenForAsociatie(useGreenStore.getState().byAsociatie, ASOC).find(
      (t) => t.id === task.id,
    )!;
    expect(stored.volunteer_user_id).toBeNull();
    expect(stored.volunteer_name).toBeNull();
  });
});
