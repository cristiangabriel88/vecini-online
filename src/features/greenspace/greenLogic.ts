import type { GreenTask } from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_GREEN_TASKS } from '@/shared/demo/demoData';

/** A task needs a title and a week. */
export function isValidTask(title: string, weekStart: string): boolean {
  return title.trim().length > 0 && weekStart.trim().length > 0;
}

/** Tasks sorted by week, soonest first. */
export function sortTasks(tasks: GreenTask[]): GreenTask[] {
  return [...tasks].sort(
    (a, b) => new Date(a.week_start).getTime() - new Date(b.week_start).getTime(),
  );
}

/** Whether a task already has a volunteer. */
export function isAssigned(task: GreenTask): boolean {
  return task.volunteer_user_id !== null;
}

/** How many tasks still need a volunteer. */
export function openTaskCount(tasks: GreenTask[]): number {
  return tasks.filter((t) => !isAssigned(t)).length;
}

/** Whether the given user volunteered for this task. */
export function isMine(task: GreenTask, userId: string): boolean {
  return task.volunteer_user_id === userId;
}

// ── Per-asociatie green tasks catalog ────────────────────────────────────────

export type GreenByAsociatie = Record<string, GreenTask[]>;

const EMPTY_TASKS: GreenTask[] = [];

export function greenForAsociatie(
  map: GreenByAsociatie,
  asociatieId: string | null,
): GreenTask[] {
  if (!asociatieId) return EMPTY_TASKS;
  return map[asociatieId] ?? EMPTY_TASKS;
}

export function seedGreenTasks(): GreenByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_GREEN_TASKS] };
}

export function addGreenTaskIn(
  map: GreenByAsociatie,
  asociatieId: string,
  task: GreenTask,
): GreenByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [task, ...current] };
}

export function signUpIn(
  map: GreenByAsociatie,
  asociatieId: string,
  taskId: string,
  userId: string,
  userName: string,
): GreenByAsociatie {
  const tasks = map[asociatieId] ?? [];
  return {
    ...map,
    [asociatieId]: tasks.map((t) =>
      t.id === taskId ? { ...t, volunteer_user_id: userId, volunteer_name: userName } : t,
    ),
  };
}

export function releaseIn(
  map: GreenByAsociatie,
  asociatieId: string,
  taskId: string,
): GreenByAsociatie {
  const tasks = map[asociatieId] ?? [];
  return {
    ...map,
    [asociatieId]: tasks.map((t) =>
      t.id === taskId ? { ...t, volunteer_user_id: null, volunteer_name: null } : t,
    ),
  };
}

export function migrateGreenState(persisted: unknown): GreenByAsociatie {
  const p = persisted as { byAsociatie?: GreenByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_GREEN_TASKS] };
}
