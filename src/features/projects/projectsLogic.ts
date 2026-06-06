import type { Project, ProjectPhase, ProjectPhaseStatus, ProjectStatus } from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_PROJECTS } from '@/shared/demo/demoData';
import { emptyArray } from '@/shared/lib/emptyArray';

/** All project statuses, in the order shown in the status picker. */
export const PROJECT_STATUSES: ProjectStatus[] = ['planificat', 'in_curs', 'finalizat', 'suspendat'];

/** Sort weight — active work first, then planned, suspended, finished last. */
const STATUS_ORDER: Record<ProjectStatus, number> = {
  in_curs: 0,
  planificat: 1,
  suspendat: 2,
  finalizat: 3,
};

/** Badge tone for each project status. */
export function statusTone(status: ProjectStatus): 'primary' | 'neutral' | 'success' | 'warning' {
  switch (status) {
    case 'in_curs':
      return 'primary';
    case 'finalizat':
      return 'success';
    case 'suspendat':
      return 'warning';
    default:
      return 'neutral';
  }
}

/** Next status when advancing a phase (asteptare → in_curs → finalizat → asteptare). */
export function nextPhaseStatus(status: ProjectPhaseStatus): ProjectPhaseStatus {
  switch (status) {
    case 'asteptare':
      return 'in_curs';
    case 'in_curs':
      return 'finalizat';
    default:
      return 'asteptare';
  }
}

/** A project needs a 3+ char title and a non-negative allocated budget. */
export function isValidProject(title: string, budget: number): boolean {
  return title.trim().length >= 3 && Number.isFinite(budget) && budget >= 0;
}

/**
 * Percentage of phases finished, 0–100 (rounded). With no phases it falls back
 * to the project status: a finished project reads 100%, anything else 0%.
 */
export function percentComplete(project: Project): number {
  if (project.phases.length === 0) return project.status === 'finalizat' ? 100 : 0;
  const done = project.phases.filter((p) => p.status === 'finalizat').length;
  return Math.round((done / project.phases.length) * 100);
}

/** Lei still available: allocated − spent (can be negative if over budget). */
export function budgetRemaining(project: Project): number {
  return project.budget_allocated - project.budget_spent;
}

/** Spent as a percentage of allocated, clamped 0–100. 0 when nothing allocated. */
export function budgetUsedPercent(project: Project): number {
  if (project.budget_allocated <= 0) return 0;
  return Math.min(100, Math.round((project.budget_spent / project.budget_allocated) * 100));
}

/** The first phase not yet finished — the "current" one. Null when all done or none. */
export function currentPhase(project: Project): ProjectPhase | null {
  return project.phases.find((p) => p.status !== 'finalizat') ?? null;
}

/** Active and planned projects first, then by most-recently created. */
export function sortProjects(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => {
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (byStatus !== 0) return byStatus;
    return a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0;
  });
}

// ── Per-asociatie project catalog ────────────────────────────────────────────

export type ProjectsByAsociatie = Record<string, Project[]>;

const EMPTY_PROJECTS = emptyArray<Project>();

export function projectsForAsociatie(
  map: ProjectsByAsociatie,
  asociatieId: string | null,
): Project[] {
  if (!asociatieId) return EMPTY_PROJECTS;
  return map[asociatieId] ?? EMPTY_PROJECTS;
}

export function seedProjects(): ProjectsByAsociatie {
  return {
    [DEMO_ASOCIATIE.id]: DEMO_PROJECTS.map((p) => ({
      ...p,
      phases: p.phases.map((ph) => ({ ...ph })),
    })),
  };
}

export function addProjectIn(
  map: ProjectsByAsociatie,
  asociatieId: string,
  project: Project,
): ProjectsByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [...current, project] };
}

export function migrateProjectsState(persisted: unknown): ProjectsByAsociatie {
  const p = persisted as { byAsociatie?: ProjectsByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return {
    ...existing,
    [DEMO_ASOCIATIE.id]: DEMO_PROJECTS.map((proj) => ({
      ...proj,
      phases: proj.phases.map((ph) => ({ ...ph })),
    })),
  };
}
