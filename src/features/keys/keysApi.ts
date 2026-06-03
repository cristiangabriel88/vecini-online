import type { KeyRecord } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useKeysStore } from './keysStore';

interface KeyRow {
  id: string;
  asociatie_id: string;
  space: string | null;
  holder_name: string | null;
  notes: string | null;
}

function rowToKey(row: KeyRow): KeyRecord {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    space: row.space ?? '',
    holder_name: row.holder_name ?? '',
    notes: row.notes,
  };
}

/**
 * Hydrate one asociatie's key registry from the backend. No-op offline.
 */
export async function hydrateKeys(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useKeysStore.getState();
  try {
    const { data, error } = await supabase
      .from('keys')
      .select('id, asociatie_id, space, holder_name, notes')
      .eq('asociatie_id', asociatieId)
      .order('space', { ascending: true });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'keysApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as KeyRow[]).map(rowToKey));
  } catch (err) {
    reportError(err, { source: 'keysApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Add a key record: update store synchronously then mirror insert to DB.
 */
export function addKeyLive(asociatieId: string, key: KeyRecord): void {
  useKeysStore.getState().addKey(asociatieId, key);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('keys').insert({
        id: key.id,
        asociatie_id: asociatieId,
        space: key.space,
        holder_name: key.holder_name,
        notes: key.notes ?? null,
      });
    } catch (err) {
      reportError(err, { source: 'keysApi.add' });
    }
  })();
}

/**
 * Record a key handover: update store synchronously then mirror DB update.
 */
export function handoverKeyLive(asociatieId: string, id: string, newHolder: string): void {
  useKeysStore.getState().handover(asociatieId, id, newHolder);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('keys').update({ holder_name: newHolder.trim() }).eq('id', id);
    } catch (err) {
      reportError(err, { source: 'keysApi.handover' });
    }
  })();
}
