import type { RepairRecord, RepairSystem } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useRepairRecordsStore } from './repairRecordsStore';

interface RepairRow {
  id: string;
  asociatie_id: string;
  system: string | null;
  title: string | null;
  description: string | null;
  contractor: string | null;
  cost: number | null;
  warranty_until: string | null;
  performed_at: string | null;
  created_at: string;
}

const VALID_SYSTEMS = new Set<string>(['apa', 'electric', 'lift', 'incalzire', 'structura', 'altele']);

function rowToRepair(row: RepairRow): RepairRecord {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    system: (VALID_SYSTEMS.has(row.system ?? '') ? row.system : 'altele') as RepairSystem,
    title: row.title ?? '',
    description: row.description ?? '',
    contractor: row.contractor,
    cost: row.cost,
    warranty_until: row.warranty_until,
    performed_at: row.performed_at ?? '',
    created_at: row.created_at,
  };
}

/**
 * Hydrate one asociatie's repair records from the backend. Reads `repair_records`
 * newest-first (by `performed_at`). No-op when the backend is absent or the id
 * is empty; the seeded demo store stays the source of truth offline.
 */
export async function hydrateRepairs(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useRepairRecordsStore.getState();
  try {
    const { data, error } = await supabase
      .from('repair_records')
      .select(
        'id, asociatie_id, system, title, description, contractor, cost, warranty_until, performed_at, created_at',
      )
      .eq('asociatie_id', asociatieId)
      .order('performed_at', { ascending: false });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'repairRecordsApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as RepairRow[]).map(rowToRepair));
  } catch (err) {
    reportError(err, { source: 'repairRecordsApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Add a repair record: apply to the store synchronously then mirror an insert
 * to `repair_records` (admin/comitet-only via RLS) behind `isSupabaseConfigured`.
 */
export function addRepair(asociatieId: string, record: RepairRecord): void {
  useRepairRecordsStore.getState().addRecord(asociatieId, record);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('repair_records').insert({
        asociatie_id: asociatieId,
        system: record.system,
        title: record.title,
        description: record.description,
        contractor: record.contractor,
        cost: record.cost,
        warranty_until: record.warranty_until,
        performed_at: record.performed_at,
      });
    } catch (err) {
      reportError(err, { source: 'repairRecordsApi.add' });
    }
  })();
}
