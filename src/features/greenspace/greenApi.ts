import type { GreenTask } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useGreenStore } from './greenStore';

interface GreenRow {
  id: string;
  asociatie_id: string;
  title: string | null;
  week_start: string | null;
  volunteer_user_id: string | null;
  volunteer_name: string | null;
}

function rowToTask(row: GreenRow): GreenTask {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    title: row.title ?? '',
    week_start: row.week_start ?? '',
    volunteer_user_id: row.volunteer_user_id,
    volunteer_name: row.volunteer_name,
  };
}

/**
 * Hydrate one asociatie's green-space tasks from the backend. Reads
 * `green_space_tasks` ordered by week_start ascending. No-op offline.
 */
export async function hydrateGreenTasks(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useGreenStore.getState();
  try {
    const { data, error } = await supabase
      .from('green_space_tasks')
      .select('id, asociatie_id, title, week_start, volunteer_user_id, volunteer_name')
      .eq('asociatie_id', asociatieId)
      .order('week_start');
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'greenApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as GreenRow[]).map(rowToTask));
  } catch (err) {
    reportError(err, { source: 'greenApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Add a green task: apply to the store synchronously then mirror an insert
 * to `green_space_tasks` behind `isSupabaseConfigured`.
 */
export function addGreenTask(asociatieId: string, task: GreenTask): void {
  useGreenStore.getState().addTask(asociatieId, task);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('green_space_tasks').insert({
        id: task.id,
        asociatie_id: asociatieId,
        title: task.title,
        week_start: task.week_start,
      });
    } catch (err) {
      reportError(err, { source: 'greenApi.add' });
    }
  })();
}

/**
 * Sign up for a task: apply to the store synchronously then mirror an update
 * to `green_space_tasks` behind `isSupabaseConfigured`.
 */
export function signUpForTask(
  asociatieId: string,
  taskId: string,
  userId: string,
  userName: string,
): void {
  useGreenStore.getState().signUp(asociatieId, taskId, userId, userName);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase
        .from('green_space_tasks')
        .update({ volunteer_user_id: userId, volunteer_name: userName })
        .eq('id', taskId)
        .eq('asociatie_id', asociatieId);
    } catch (err) {
      reportError(err, { source: 'greenApi.signUp' });
    }
  })();
}

/**
 * Release from a task: apply to the store synchronously then mirror an update
 * to `green_space_tasks` behind `isSupabaseConfigured`.
 */
export function releaseTask(asociatieId: string, taskId: string): void {
  useGreenStore.getState().release(asociatieId, taskId);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase
        .from('green_space_tasks')
        .update({ volunteer_user_id: null, volunteer_name: null })
        .eq('id', taskId)
        .eq('asociatie_id', asociatieId);
    } catch (err) {
      reportError(err, { source: 'greenApi.release' });
    }
  })();
}
