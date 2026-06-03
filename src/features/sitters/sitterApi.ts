import type { SitterProfile } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useSitterStore } from './sitterStore';

interface SitterRow {
  id: string;
  asociatie_id: string;
  user_id: string | null;
  user_name: string | null;
  kind: string | null;
  availability: string | null;
  rate: string | null;
}

function rowToProfile(row: SitterRow): SitterProfile {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    user_id: row.user_id ?? '',
    user_name: row.user_name ?? '',
    kind: row.kind ?? 'babysitting',
    availability: row.availability ?? '',
    rate: row.rate ?? '',
  };
}

export async function hydrateSitters(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useSitterStore.getState();
  try {
    const { data, error } = await supabase
      .from('sitter_profiles')
      .select('id,asociatie_id,user_id,user_name,kind,availability,rate')
      .eq('asociatie_id', asociatieId);
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'sitterApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as SitterRow[]).map(rowToProfile));
  } catch (err) {
    reportError(err, { source: 'sitterApi.hydrate' });
    store.setFetchError('load');
  }
}

export function saveSitterProfile(asociatieId: string, profile: SitterProfile): void {
  useSitterStore.getState().upsertProfile(asociatieId, profile);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('sitter_profiles').upsert(
        {
          id: profile.id,
          asociatie_id: asociatieId,
          user_id: profile.user_id,
          user_name: profile.user_name,
          kind: profile.kind,
          availability: profile.availability,
          rate: profile.rate,
        },
        { onConflict: 'asociatie_id,user_id' },
      );
    } catch (err) {
      reportError(err, { source: 'sitterApi.save' });
    }
  })();
}

export function leaveSitterProfile(asociatieId: string, userId: string): void {
  useSitterStore.getState().removeProfile(asociatieId, userId);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase
        .from('sitter_profiles')
        .delete()
        .eq('asociatie_id', asociatieId)
        .eq('user_id', userId);
    } catch (err) {
      reportError(err, { source: 'sitterApi.leave' });
    }
  })();
}
