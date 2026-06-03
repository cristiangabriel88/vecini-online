import type { CarpoolProfile } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useCarpoolStore } from './carpoolStore';

interface CarpoolRow {
  id: string;
  asociatie_id: string;
  user_id: string | null;
  user_name: string | null;
  destination: string | null;
  schedule: string | null;
}

function rowToProfile(row: CarpoolRow): CarpoolProfile {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    user_id: row.user_id ?? '',
    user_name: row.user_name ?? '',
    destination: row.destination ?? '',
    schedule: row.schedule ?? '',
  };
}

export async function hydrateCarpool(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useCarpoolStore.getState();
  try {
    const { data, error } = await supabase
      .from('carpool_profiles')
      .select('id,asociatie_id,user_id,user_name,destination,schedule')
      .eq('asociatie_id', asociatieId);
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'carpoolApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as CarpoolRow[]).map(rowToProfile));
  } catch (err) {
    reportError(err, { source: 'carpoolApi.hydrate' });
    store.setFetchError('load');
  }
}

export function saveCarpoolProfile(asociatieId: string, profile: CarpoolProfile): void {
  useCarpoolStore.getState().upsertProfile(asociatieId, profile);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('carpool_profiles').upsert(
        {
          id: profile.id,
          asociatie_id: asociatieId,
          user_id: profile.user_id,
          user_name: profile.user_name,
          destination: profile.destination,
          schedule: profile.schedule,
        },
        { onConflict: 'asociatie_id,user_id' },
      );
    } catch (err) {
      reportError(err, { source: 'carpoolApi.save' });
    }
  })();
}

export function leaveCarpoolProfile(asociatieId: string, userId: string): void {
  useCarpoolStore.getState().removeProfile(asociatieId, userId);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase
        .from('carpool_profiles')
        .delete()
        .eq('asociatie_id', asociatieId)
        .eq('user_id', userId);
    } catch (err) {
      reportError(err, { source: 'carpoolApi.leave' });
    }
  })();
}
