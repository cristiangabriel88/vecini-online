import type { Project, ProjectPhase, ProjectPhaseStatus, ProjectStatus } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useProjectsStore } from './projectsStore';

interface ProjectRow {
  id: string;
  asociatie_id: string;
  title: string | null;
  description: string | null;
  contractor: string | null;
  budget_allocated: number | null;
  budget_spent: number | null;
  status: string | null;
  created_at: string;
}

interface PhaseRow {
  id: string;
  project_id: string | null;
  title: string | null;
  percent_complete: number | null;
  sort_order: number | null;
}

function phaseStatusFromPct(pct: number | null): ProjectPhaseStatus {
  if (pct === null || pct === 0) return 'asteptare';
  if (pct >= 100) return 'finalizat';
  return 'in_curs';
}

function buildProject(row: ProjectRow, phases: PhaseRow[]): Project {
  const projectPhases = phases
    .filter((ph) => ph.project_id === row.id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(
      (ph): ProjectPhase => ({
        id: ph.id,
        name: ph.title ?? '',
        status: phaseStatusFromPct(ph.percent_complete),
      }),
    );
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    title: row.title ?? '',
    description: row.description ?? '',
    contractor: row.contractor ?? '',
    status: (row.status as ProjectStatus) ?? 'planificat',
    budget_allocated: row.budget_allocated ?? 0,
    budget_spent: row.budget_spent ?? 0,
    phases: projectPhases,
    created_at: row.created_at,
  };
}

export async function hydrateProjects(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useProjectsStore.getState();
  try {
    const [projectsRes, phasesRes] = await Promise.all([
      supabase
        .from('projects')
        .select(
          'id, asociatie_id, title, description, contractor, budget_allocated, budget_spent, status, created_at',
        )
        .eq('asociatie_id', asociatieId)
        .order('created_at', { ascending: false }),
      supabase
        .from('project_phases')
        .select('id, project_id, title, percent_complete, sort_order')
        .eq('asociatie_id', asociatieId),
    ]);
    if (projectsRes.error || !projectsRes.data) {
      reportError(projectsRes.error ?? new Error('no data'), { source: 'projectsApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    const phases = (phasesRes.data ?? []) as PhaseRow[];
    store.replaceForAsociatie(
      asociatieId,
      (projectsRes.data as ProjectRow[]).map((row) => buildProject(row, phases)),
    );
  } catch (err) {
    reportError(err, { source: 'projectsApi.hydrate' });
    store.setFetchError('load');
  }
}

export function addProjectLive(asociatieId: string, project: Project): void {
  useProjectsStore.getState().addProject(asociatieId, project);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('projects').insert({
        id: project.id,
        asociatie_id: asociatieId,
        title: project.title,
        description: project.description,
        contractor: project.contractor,
        budget_allocated: project.budget_allocated,
        budget_spent: project.budget_spent,
        status: project.status,
      });
    } catch (err) {
      reportError(err, { source: 'projectsApi.add' });
    }
  })();
}

export function setProjectStatusLive(
  asociatieId: string,
  projectId: string,
  status: ProjectStatus,
): void {
  useProjectsStore.getState().setStatus(asociatieId, projectId, status);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase
        .from('projects')
        .update({ status })
        .eq('id', projectId)
        .eq('asociatie_id', asociatieId);
    } catch (err) {
      reportError(err, { source: 'projectsApi.setStatus' });
    }
  })();
}
