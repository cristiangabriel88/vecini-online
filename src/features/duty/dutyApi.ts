import type { DutySlot } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useDutyStore } from './dutyStore';

interface DutyScheduleRow {
  id: string;
  asociatie_id: string;
  week_start: string;
  volunteer_user_id: string | null;
  volunteer_name: string | null;
  note: string | null;
}

function rowToDutySlot(row: DutyScheduleRow): DutySlot {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    week_start: row.week_start,
    volunteer_user_id: row.volunteer_user_id,
    volunteer_name: row.volunteer_name,
    note: row.note,
  };
}

/**
 * Hydrate one asociatie's duty slots from the backend. Reads `duty_schedule`
 * ordered by `week_start` ascending. No-op offline.
 */
export async function hydrateDutySlots(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useDutyStore.getState();
  try {
    const { data, error } = await supabase
      .from('duty_schedule')
      .select('id, asociatie_id, week_start, volunteer_user_id, volunteer_name, note')
      .eq('asociatie_id', asociatieId)
      .order('week_start', { ascending: true });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'dutyApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(
      asociatieId,
      (data as DutyScheduleRow[]).map(rowToDutySlot),
    );
  } catch (err) {
    reportError(err, { source: 'dutyApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Sign up for a duty slot: apply to the store synchronously then mirror
 * an update to `duty_schedule` behind `isSupabaseConfigured`.
 */
export function signUpForDuty(
  asociatieId: string,
  slotId: string,
  userId: string,
  userName: string,
  note: string,
): void {
  useDutyStore.getState().signUp(asociatieId, slotId, userId, userName, note);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase
        .from('duty_schedule')
        .update({
          volunteer_user_id: userId,
          volunteer_name: userName,
          note: note.trim() || null,
        })
        .eq('id', slotId)
        .eq('asociatie_id', asociatieId);
    } catch (err) {
      reportError(err, { source: 'dutyApi.signUp' });
    }
  })();
}

/**
 * Release a duty slot: apply to the store synchronously then mirror
 * a null-out update to `duty_schedule` behind `isSupabaseConfigured`.
 */
export function releaseFromDuty(asociatieId: string, slotId: string): void {
  useDutyStore.getState().release(asociatieId, slotId);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase
        .from('duty_schedule')
        .update({ volunteer_user_id: null, volunteer_name: null, note: null })
        .eq('id', slotId)
        .eq('asociatie_id', asociatieId);
    } catch (err) {
      reportError(err, { source: 'dutyApi.release' });
    }
  })();
}
