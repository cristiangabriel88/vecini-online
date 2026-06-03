import type { LendingItem } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useLendingStore } from './lendingStore';

interface LendingRow {
  id: string;
  asociatie_id: string;
  owner_user_id: string | null;
  owner_name: string | null;
  name: string | null;
  category: string | null;
  photo_path: string | null;
  available: boolean;
  created_at: string;
}

function rowToLendingItem(row: LendingRow): LendingItem {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    owner_user_id: row.owner_user_id ?? '',
    owner_name: row.owner_name ?? '',
    name: row.name ?? '',
    category: row.category ?? '',
    photo_path: row.photo_path,
    available: row.available,
    created_at: row.created_at,
  };
}

/**
 * Hydrate one asociatie's lending items from the backend. Reads `lending_items`
 * newest first. No-op offline.
 */
export async function hydrateLendingItems(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useLendingStore.getState();
  try {
    const { data, error } = await supabase
      .from('lending_items')
      .select('id, asociatie_id, owner_user_id, owner_name, name, category, photo_path, available, created_at')
      .eq('asociatie_id', asociatieId)
      .order('created_at', { ascending: false });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'lendingApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(
      asociatieId,
      (data as LendingRow[]).map(rowToLendingItem),
    );
  } catch (err) {
    reportError(err, { source: 'lendingApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Add a lending item: apply to the store synchronously then mirror an insert
 * to `lending_items` behind `isSupabaseConfigured`.
 */
export function addLendingItem(asociatieId: string, item: LendingItem): void {
  useLendingStore.getState().addItem(asociatieId, item);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('lending_items').insert({
        id: item.id,
        asociatie_id: asociatieId,
        owner_user_id: item.owner_user_id,
        owner_name: item.owner_name,
        name: item.name,
        category: item.category,
        available: item.available,
      });
    } catch (err) {
      reportError(err, { source: 'lendingApi.add' });
    }
  })();
}

/**
 * Toggle item availability: apply to the store synchronously then mirror
 * an update to `lending_items` behind `isSupabaseConfigured`.
 */
export function toggleLendingAvailable(
  asociatieId: string,
  item: LendingItem,
): void {
  useLendingStore.getState().toggleAvailable(asociatieId, item.id);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase
        .from('lending_items')
        .update({ available: !item.available })
        .eq('id', item.id)
        .eq('asociatie_id', asociatieId);
    } catch (err) {
      reportError(err, { source: 'lendingApi.toggle' });
    }
  })();
}
