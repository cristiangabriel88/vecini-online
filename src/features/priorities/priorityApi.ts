import type { PriorityProject } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { fetchPriorityTurnout } from '@/shared/lib/tallyApi';
import { sortByRank } from './priorityLogic';
import { usePriorityStore } from './priorityStore';

/* Dual-mode project-priorities repository (F13, T193). The zustand store is
   the synchronous source of truth the page reads; these functions apply each
   change there and, when a backend is configured, mirror it to
   `project_priorities` (canonical project list, comitet-managed) and
   `priority_rankings` (per-apartment rank submissions, any member may insert)
   under RLS. The demo/offline store stays the default when Supabase is absent.

   Turnout (how many apartments submitted a ranking) is read via the
   attribution-free `priority_ranking_turnout` SECURITY DEFINER RPC (T80). */

interface ProjectRow {
  id: string;
  asociatie_id: string;
  title: string | null;
  description: string | null;
  rank: number;
  created_at: string;
}

function rowToProject(row: ProjectRow): PriorityProject {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    title: row.title ?? '',
    description: row.description ?? '',
    rank: row.rank,
  };
}

/**
 * Hydrate one asociație's project list from `project_priorities` ordered by
 * rank then created_at. Sets fetchError on failure; clears it on success.
 * No-op when the backend is absent or asociatieId is empty.
 */
export async function hydratePriorities(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = usePriorityStore.getState();
  try {
    const { data: rows, error } = await supabase
      .from('project_priorities')
      .select('id, asociatie_id, title, description, rank, created_at')
      .eq('asociatie_id', asociatieId)
      .order('rank', { ascending: true })
      .order('created_at', { ascending: true });
    if (error || !rows) {
      reportError(error ?? new Error('no data'), { source: 'priorityApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    const projects = (rows as ProjectRow[]).map((r) => rowToProject(r));
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, projects);
  } catch (err) {
    reportError(err, { source: 'priorityApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Add a new project: apply to the store synchronously (optimistic) then
 * mirror an insert to `project_priorities` when a backend is configured.
 * The project rank is set to (current max + 1) so it appears last.
 */
export function addPriorityProject(asociatieId: string, project: PriorityProject): void {
  usePriorityStore.getState().addProject(asociatieId, project);
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase.from('project_priorities').insert({
          id: project.id,
          asociatie_id: asociatieId,
          title: project.title,
          description: project.description || null,
          rank: project.rank,
        });
      } catch (err) {
        reportError(err, { source: 'priorityApi.add' });
      }
    })();
  }
}

/**
 * Persist the current ranking: apply to the store synchronously then, when a
 * backend is configured, batch-update ranks in `project_priorities` (comitet
 * writes) and insert an apartment-level entry into `priority_rankings` (any
 * member may insert per the T193 policy).
 */
export function saveRanking(
  asociatieId: string,
  projects: PriorityProject[],
  apartmentId: string | null,
): void {
  usePriorityStore.getState().reorderProjects(asociatieId, projects);
  if (!isSupabaseConfigured) return;
  const ordered = sortByRank(projects);
  void (async () => {
    try {
      await Promise.all(
        ordered.map((p, i) =>
          supabase
            .from('project_priorities')
            .update({ rank: i + 1 })
            .eq('id', p.id)
            .eq('asociatie_id', asociatieId),
        ),
      );
    } catch (err) {
      reportError(err, { source: 'priorityApi.saveRanking.update' });
    }
  })();
  if (apartmentId) {
    const ranking = ordered.map((p) => p.id);
    void (async () => {
      try {
        await supabase.from('priority_rankings').insert({
          asociatie_id: asociatieId,
          apartment_id: apartmentId,
          ranking,
        });
      } catch (err) {
        reportError(err, { source: 'priorityApi.saveRanking.rank' });
      }
    })();
  }
}

/** Turnout: number of apartments that submitted a ranking via the T80 RPC. */
export { fetchPriorityTurnout };
