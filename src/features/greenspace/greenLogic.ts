import type { GreenTask } from '@/shared/types/domain';

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
