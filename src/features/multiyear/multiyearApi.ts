import type { MultiyearPlanItem } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useMultiyearStore } from './multiyearStore';

interface MultiyearRow {
  id: string;
  asociatie_id: string;
  year: number | null;
  title: string | null;
  estimated_cost: number | null;
  notes: string | null;
}

function rowToItem(row: MultiyearRow): MultiyearPlanItem {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    year: row.year ?? 0,
    title: row.title ?? '',
    estimated_cost: row.estimated_cost ?? 0,
    notes: row.notes,
  };
}

export async function hydrateMultiyear(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useMultiyearStore.getState();
  try {
    const { data, error } = await supabase
      .from('multiyear_plan_items')
      .select('id, asociatie_id, year, title, estimated_cost, notes')
      .eq('asociatie_id', asociatieId)
      .order('year', { ascending: true });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'multiyearApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as MultiyearRow[]).map(rowToItem));
  } catch (err) {
    reportError(err, { source: 'multiyearApi.hydrate' });
    store.setFetchError('load');
  }
}

export function addMultiyearItemLive(asociatieId: string, item: MultiyearPlanItem): void {
  useMultiyearStore.getState().addItem(asociatieId, item);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('multiyear_plan_items').insert({
        id: item.id,
        asociatie_id: asociatieId,
        year: item.year,
        title: item.title,
        estimated_cost: item.estimated_cost,
        notes: item.notes,
      });
    } catch (err) {
      reportError(err, { source: 'multiyearApi.add' });
    }
  })();
}
