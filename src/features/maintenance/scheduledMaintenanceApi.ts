import type { ScheduledMaintenance } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useMaintenanceStore, type NewMaintenance } from './maintenanceStore';

interface MaintenanceRow {
  id: string;
  asociatie_id: string;
  title: string | null;
  vendor: string | null;
  recurrence: string | null;
  last_done: string | null;
  next_due: string | null;
  notes: string | null;
}

function rowToMaintenance(row: MaintenanceRow): ScheduledMaintenance {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    title: row.title ?? '',
    vendor: row.vendor,
    recurrence: row.recurrence ?? 'O singura data',
    last_done: row.last_done,
    next_due: row.next_due ?? '',
    notes: row.notes,
  };
}

/**
 * Hydrate one asociatie's scheduled maintenance list from the backend. Reads
 * `scheduled_maintenance` ordered by `next_due` ascending (soonest first). No-op
 * when the backend is absent or the id is empty; the seeded demo store stays
 * the source of truth offline.
 */
export async function hydrateMaintenance(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useMaintenanceStore.getState();
  try {
    const { data, error } = await supabase
      .from('scheduled_maintenance')
      .select('id, asociatie_id, title, vendor, recurrence, last_done, next_due, notes')
      .eq('asociatie_id', asociatieId)
      .order('next_due', { ascending: true });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'scheduledMaintenanceApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as MaintenanceRow[]).map(rowToMaintenance));
  } catch (err) {
    reportError(err, { source: 'scheduledMaintenanceApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Add a scheduled maintenance task: apply to the store synchronously then
 * mirror an insert to `scheduled_maintenance` (comitet-write via RLS) behind
 * `isSupabaseConfigured`.
 */
export function addMaintenanceItem(
  asociatieId: string,
  input: NewMaintenance,
): ScheduledMaintenance {
  const item: ScheduledMaintenance = {
    id: `sm-${Date.now()}`,
    asociatie_id: asociatieId,
    title: input.title.trim(),
    vendor: input.vendor.trim() || null,
    recurrence: input.recurrence.trim() || 'O singura data',
    last_done: null,
    next_due: input.nextDue,
    notes: input.notes.trim() || null,
  };
  useMaintenanceStore.getState().addItem(asociatieId, item);
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase.from('scheduled_maintenance').insert({
          asociatie_id: asociatieId,
          title: item.title,
          vendor: item.vendor,
          recurrence: item.recurrence,
          next_due: item.next_due,
          notes: item.notes,
        });
      } catch (err) {
        reportError(err, { source: 'scheduledMaintenanceApi.add' });
      }
    })();
  }
  return item;
}

/**
 * Mark a maintenance task done: apply to the store synchronously then mirror
 * an update to `scheduled_maintenance` behind `isSupabaseConfigured`.
 */
export function markMaintenanceDone(
  asociatieId: string,
  id: string,
  rollForwardDays: number,
): void {
  useMaintenanceStore.getState().markDoneLocal(asociatieId, id, rollForwardDays);
  if (!isSupabaseConfigured) return;
  const today = new Date().toISOString().slice(0, 10);
  const next = new Date(Date.now() + rollForwardDays * 86_400_000).toISOString().slice(0, 10);
  void (async () => {
    try {
      await supabase
        .from('scheduled_maintenance')
        .update({ last_done: today, next_due: next })
        .eq('id', id)
        .eq('asociatie_id', asociatieId);
    } catch (err) {
      reportError(err, { source: 'scheduledMaintenanceApi.markDone' });
    }
  })();
}
