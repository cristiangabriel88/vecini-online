import type { Role, PriorityProject } from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_PRIORITIES } from '@/shared/demo/demoData';
import { isGovernanceRole } from '@/shared/lib/roleUtils';

/** A project needs a title. */
export function isValidProject(title: string): boolean {
  return title.trim().length > 0;
}

/** Projects ordered by rank, highest priority (lowest rank number) first. */
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

/**
 * Apply a drag-and-drop reorder: move the item with `activeId` to the slot
 * occupied by `overId`, shifting items between them. Re-numbers ranks 1..n.
 */
export function applyReorder(
  projects: PriorityProject[],
  activeId: string,
  overId: string,
): PriorityProject[] {
  if (activeId === overId) return projects;
  const ordered = sortByRank(projects);
  const fromIdx = ordered.findIndex((p) => p.id === activeId);
  const toIdx = ordered.findIndex((p) => p.id === overId);
  if (fromIdx === -1 || toIdx === -1) return projects;
  const result = [...ordered];
  const [moved] = result.splice(fromIdx, 1);
  result.splice(toIdx, 0, moved);
  return result.map((p, i) => ({ ...p, rank: i + 1 }));
}

/** Only admin/presedinte/comitet can add projects or save the canonical order. */
export function canManagePriorities(role: Role | null): boolean {
  return isGovernanceRole(role);
}

// ── Per-asociație catalog ────────────────────────────────────────────────────

export interface PriorityCatalog {
  projects: PriorityProject[];
}

export type PrioritiesByAsociatie = Record<string, PriorityCatalog>;

const EMPTY_CATALOG: PriorityCatalog = Object.freeze({ projects: [] as PriorityProject[] });

function cloneProjects(projects: PriorityProject[]): PriorityProject[] {
  return projects.map((p) => ({ ...p }));
}

/** Initial store state: demo asociație gets the seeded projects. */
export function seedPriorities(): PrioritiesByAsociatie {
  return { [DEMO_ASOCIATIE.id]: { projects: cloneProjects(DEMO_PRIORITIES) } };
}

/** The priority catalog for one asociație (stable reference, never null). */
export function prioritiesForAsociatie(
  map: PrioritiesByAsociatie,
  asociatieId: string | null,
): PriorityCatalog {
  if (!asociatieId) return EMPTY_CATALOG;
  return map[asociatieId] ?? EMPTY_CATALOG;
}

/**
 * Migrate persisted state to the current shape. Preserves non-demo asociații
 * and always reseeds the demo asociație so stale demo content is refreshed.
 */
export function migratePrioritiesState(persisted: unknown): PrioritiesByAsociatie {
  const p = persisted as { byAsociatie?: PrioritiesByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: { projects: cloneProjects(DEMO_PRIORITIES) } };
}
