import type { GroupBuy } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useGroupBuyStore } from './groupBuyStore';

interface GroupBuyRow {
  id: string;
  asociatie_id: string;
  organizer_user_id: string | null;
  organizer_name: string | null;
  title: string | null;
  description: string | null;
  deadline: string | null;
  created_at: string;
  signups?: number;
}

function rowToBuy(row: GroupBuyRow): GroupBuy {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    organizer_user_id: row.organizer_user_id ?? '',
    organizer_name: row.organizer_name ?? '',
    title: row.title ?? '',
    description: row.description ?? '',
    deadline: row.deadline ?? new Date().toISOString(),
    created_at: row.created_at,
    signups: row.signups ?? 0,
  };
}

export async function hydrateGroupBuys(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useGroupBuyStore.getState();
  try {
    const { data, error } = await supabase
      .from('group_buys')
      .select('id,asociatie_id,organizer_user_id,organizer_name,title,description,deadline,created_at')
      .eq('asociatie_id', asociatieId)
      .order('created_at', { ascending: false });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'groupBuyApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    const buys = data as GroupBuyRow[];
    const signupCounts = await Promise.all(
      buys.map((b) =>
        supabase
          .from('group_buy_signups')
          .select('id', { count: 'exact', head: true })
          .eq('group_buy_id', b.id)
          .then(({ count }) => ({ id: b.id, count: count ?? 0 })),
      ),
    );
    const countMap: Record<string, number> = {};
    for (const { id, count } of signupCounts) countMap[id] = count;
    store.setFetchError(null);
    store.replaceForAsociatie(
      asociatieId,
      buys.map((b) => rowToBuy({ ...b, signups: countMap[b.id] ?? 0 })),
    );
  } catch (err) {
    reportError(err, { source: 'groupBuyApi.hydrate' });
    store.setFetchError('load');
  }
}

export function addGroupBuyLive(asociatieId: string, buy: GroupBuy): void {
  useGroupBuyStore.getState().addBuy(asociatieId, buy);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('group_buys').insert({
        id: buy.id,
        asociatie_id: asociatieId,
        organizer_user_id: buy.organizer_user_id,
        organizer_name: buy.organizer_name,
        title: buy.title,
        description: buy.description,
        deadline: buy.deadline,
      });
    } catch (err) {
      reportError(err, { source: 'groupBuyApi.add' });
    }
  })();
}

export function joinGroupBuyLive(
  asociatieId: string,
  buyId: string,
  userId: string,
): void {
  useGroupBuyStore.getState().joinBuy(asociatieId, buyId);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('group_buy_signups').upsert(
        { asociatie_id: asociatieId, group_buy_id: buyId, user_id: userId },
        { onConflict: 'group_buy_id,user_id' },
      );
    } catch (err) {
      reportError(err, { source: 'groupBuyApi.join' });
    }
  })();
}
