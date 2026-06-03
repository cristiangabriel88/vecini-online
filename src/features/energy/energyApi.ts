import type { EnergyRecord } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useEnergyStore } from './energyStore';

interface EnergyRow {
  id: string;
  asociatie_id: string;
  period: string | null;
  kind: string | null;
  amount: number | null;
  cost: number | null;
}

function rowToRecord(row: EnergyRow): EnergyRecord {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    period: row.period ?? '',
    kind: row.kind ?? '',
    amount: row.amount ?? 0,
    cost: row.cost ?? 0,
  };
}

export async function hydrateEnergy(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useEnergyStore.getState();
  try {
    const { data, error } = await supabase
      .from('energy_records')
      .select('id, asociatie_id, period, kind, amount, cost')
      .eq('asociatie_id', asociatieId)
      .order('period', { ascending: false });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'energyApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as EnergyRow[]).map(rowToRecord));
  } catch (err) {
    reportError(err, { source: 'energyApi.hydrate' });
    store.setFetchError('load');
  }
}

export function addEnergyRecordLive(asociatieId: string, record: EnergyRecord): void {
  useEnergyStore.getState().addRecord(asociatieId, record);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('energy_records').insert({
        id: record.id,
        asociatie_id: asociatieId,
        period: record.period,
        kind: record.kind,
        amount: record.amount,
        cost: record.cost,
      });
    } catch (err) {
      reportError(err, { source: 'energyApi.add' });
    }
  })();
}
