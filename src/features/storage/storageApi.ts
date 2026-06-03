import type { StorageUnit } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useStorageStore } from './storageStore';

interface StorageRow {
  id: string;
  asociatie_id: string;
  label: string | null;
  apartment_id: string | null;
  apartment_label: string | null;
  notes: string | null;
}

function rowToUnit(row: StorageRow): StorageUnit {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    label: row.label ?? '',
    apartment_id: row.apartment_id,
    apartment_label: row.apartment_label,
    notes: row.notes,
  };
}

/**
 * Hydrate one asociatie's storage units from the backend. Reads `storage_units`
 * ordered by label. No-op when the backend is absent or the id is empty.
 */
export async function hydrateStorageUnits(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useStorageStore.getState();
  try {
    const { data, error } = await supabase
      .from('storage_units')
      .select('id, asociatie_id, label, apartment_id, apartment_label, notes')
      .eq('asociatie_id', asociatieId)
      .order('label');
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'storageApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as StorageRow[]).map(rowToUnit));
  } catch (err) {
    reportError(err, { source: 'storageApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Add a storage unit: apply to the store synchronously then mirror an insert
 * to `storage_units` behind `isSupabaseConfigured`.
 */
export function addStorageUnit(asociatieId: string, unit: StorageUnit): void {
  useStorageStore.getState().addUnit(asociatieId, unit);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('storage_units').insert({
        id: unit.id,
        asociatie_id: asociatieId,
        label: unit.label,
        apartment_id: unit.apartment_id,
        apartment_label: unit.apartment_label,
        notes: unit.notes,
      });
    } catch (err) {
      reportError(err, { source: 'storageApi.add' });
    }
  })();
}
