import type { WelcomeKitItem } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useWelcomeKitStore } from './welcomeKitStore';

interface KitRow {
  id: string;
  asociatie_id: string;
  order_num: number | null;
  title: string | null;
  body: string | null;
}

function rowToItem(row: KitRow): WelcomeKitItem {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    order: row.order_num ?? 0,
    title: row.title ?? '',
    body: row.body ?? '',
  };
}

export async function hydrateWelcomeKit(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useWelcomeKitStore.getState();
  try {
    const { data, error } = await supabase
      .from('welcome_kit_templates')
      .select('id,asociatie_id,order_num,title,body')
      .eq('asociatie_id', asociatieId)
      .not('title', 'is', null)
      .order('order_num', { ascending: true });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'welcomeKitApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as KitRow[]).map(rowToItem));
  } catch (err) {
    reportError(err, { source: 'welcomeKitApi.hydrate' });
    store.setFetchError('load');
  }
}

export function addWelcomeKitItemLive(asociatieId: string, item: WelcomeKitItem): void {
  useWelcomeKitStore.getState().addLiveItem(asociatieId, item);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('welcome_kit_templates').insert({
        id: item.id,
        asociatie_id: asociatieId,
        order_num: item.order,
        title: item.title,
        body: item.body,
      });
    } catch (err) {
      reportError(err, { source: 'welcomeKitApi.add' });
    }
  })();
}

export function removeWelcomeKitItemLive(itemId: string): void {
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('welcome_kit_templates').delete().eq('id', itemId);
    } catch (err) {
      reportError(err, { source: 'welcomeKitApi.remove' });
    }
  })();
}
