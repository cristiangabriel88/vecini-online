import type { PriorityProject } from '@/shared/types/domain';

/** A project needs a title. */
export function isValidProject(title: string): boolean {
  return title.trim().length > 0;
}

/** Projects ordered by rank, highest priority (lowest rank) first. */
export function sortByRank(projects: PriorityProject[]): PriorityProject[] {
  return [...projects].sort((a, b) => a.rank - b.rank);
}

/** Returns the list with the given project moved one step toward the given
 *  direction, re-numbering ranks 1..n. No-op at the boundary. */
function reorder(
  projects: PriorityProject[],
  id: string,
  dir: -1 | 1,
): PriorityProject[] {
  const ordered = sortByRank(projects);
  const idx = ordered.findIndex((p) => p.id === id);
  const swapWith = idx + dir;
  if (idx === -1 || swapWith < 0 || swapWith >= ordered.length) return projects;
  [ordered[idx], ordered[swapWith]] = [ordered[swapWith], ordered[idx]];
  return ordered.map((p, i) => ({ ...p, rank: i + 1 }));
}

/** Move a project up one position (toward higher priority). */
export function moveUp(projects: PriorityProject[], id: string): PriorityProject[] {
  return reorder(projects, id, -1);
}

/** Move a project down one position (toward lower priority). */
export function moveDown(projects: PriorityProject[], id: string): PriorityProject[] {
  return reorder(projects, id, 1);
}
