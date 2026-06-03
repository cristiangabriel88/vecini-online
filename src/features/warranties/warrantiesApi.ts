import type { Warranty } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useWarrantiesStore } from './warrantiesStore';

interface WarrantyRow {
  id: string;
  asociatie_id: string;
  asset: string | null;
  purchased_at: string | null;
  warranty_months: number | null;
  expires_at: string | null;
  document_path: string | null;
}

function rowToWarranty(row: WarrantyRow): Warranty {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    asset: row.asset ?? '',
    purchased_at: row.purchased_at ?? '',
    warranty_months: row.warranty_months ?? 0,
    expires_at: row.expires_at ?? '',
    document_path: row.document_path,
  };
}

export async function hydrateWarranties(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useWarrantiesStore.getState();
  try {
    const { data, error } = await supabase
      .from('warranties')
      .select('id, asociatie_id, asset, purchased_at, warranty_months, expires_at, document_path')
      .eq('asociatie_id', asociatieId)
      .order('expires_at', { ascending: true });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'warrantiesApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as WarrantyRow[]).map(rowToWarranty));
  } catch (err) {
    reportError(err, { source: 'warrantiesApi.hydrate' });
    store.setFetchError('load');
  }
}

export function addWarrantyLive(asociatieId: string, warranty: Warranty): void {
  useWarrantiesStore.getState().addWarranty(asociatieId, warranty);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('warranties').insert({
        id: warranty.id,
        asociatie_id: asociatieId,
        asset: warranty.asset,
        purchased_at: warranty.purchased_at,
        warranty_months: warranty.warranty_months,
        expires_at: warranty.expires_at,
        document_path: warranty.document_path,
      });
    } catch (err) {
      reportError(err, { source: 'warrantiesApi.add' });
    }
  })();
}
