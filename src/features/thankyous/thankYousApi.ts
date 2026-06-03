import type { ThankYou } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useThankYousStore } from './thankYousStore';

interface ThankYouRow {
  id: string;
  asociatie_id: string;
  from_user_id: string | null;
  from_name: string | null;
  to_apartment: string | null;
  message: string | null;
  created_at: string;
}

function rowToThankYou(row: ThankYouRow): ThankYou {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    from_user_id: row.from_user_id ?? '',
    from_name: row.from_name ?? '',
    to_apartment: row.to_apartment ?? '',
    message: row.message ?? '',
    created_at: row.created_at,
  };
}

/**
 * Hydrate one asociatie's thank-yous from the backend. Reads `thank_yous`
 * ordered by `created_at` descending. No-op when the backend is absent or id
 * is empty.
 */
export async function hydrateThankYous(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useThankYousStore.getState();
  try {
    const { data, error } = await supabase
      .from('thank_yous')
      .select('id, asociatie_id, from_user_id, from_name, to_apartment, message, created_at')
      .eq('asociatie_id', asociatieId)
      .order('created_at', { ascending: false });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'thankYousApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as ThankYouRow[]).map(rowToThankYou));
  } catch (err) {
    reportError(err, { source: 'thankYousApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Post a thank-you: apply to the store synchronously then mirror an insert
 * to `thank_yous` behind `isSupabaseConfigured`.
 */
export function postThankYouLive(asociatieId: string, item: ThankYou): void {
  useThankYousStore.getState().addItem(asociatieId, item);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('thank_yous').insert({
        id: item.id,
        asociatie_id: asociatieId,
        from_user_id: item.from_user_id,
        from_name: item.from_name,
        to_apartment: item.to_apartment,
        message: item.message,
      });
    } catch (err) {
      reportError(err, { source: 'thankYousApi.post' });
    }
  })();
}
