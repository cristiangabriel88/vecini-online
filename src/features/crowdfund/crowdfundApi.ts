import type { Crowdfund } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useCrowdfundStore } from './crowdfundStore';

interface CrowdfundRow {
  id: string;
  asociatie_id: string;
  title: string | null;
  description: string | null;
  target_amount: number | null;
  deadline: string | null;
  created_at: string;
}

interface PledgeRow {
  crowdfund_id: string;
  user_id: string | null;
  amount: number | null;
}

function buildCrowdfund(row: CrowdfundRow, pledges: PledgeRow[]): Crowdfund {
  const mine = pledges.filter((p) => p.crowdfund_id === row.id);
  const pledged = mine.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    title: row.title ?? '',
    description: row.description ?? '',
    target_amount: row.target_amount ?? 0,
    deadline: row.deadline ?? '',
    created_at: row.created_at,
    pledged,
  };
}

export async function hydrateCrowdfunds(
  asociatieId: string,
  userId: string | null,
): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useCrowdfundStore.getState();
  try {
    const [fundsRes, pledgesRes] = await Promise.all([
      supabase
        .from('crowdfunds')
        .select('id, asociatie_id, title, description, target_amount, deadline, created_at')
        .eq('asociatie_id', asociatieId)
        .order('created_at', { ascending: false }),
      supabase
        .from('pledges')
        .select('crowdfund_id, user_id, amount')
        .eq('asociatie_id', asociatieId),
    ]);
    if (fundsRes.error || !fundsRes.data) {
      reportError(fundsRes.error ?? new Error('no data'), { source: 'crowdfundApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    const pledges = (pledgesRes.data ?? []) as PledgeRow[];
    const funds = (fundsRes.data as CrowdfundRow[]).map((row) => buildCrowdfund(row, pledges));
    const pledgedIds = userId
      ? pledges.filter((p) => p.user_id === userId).map((p) => p.crowdfund_id)
      : [];
    store.replaceForAsociatie(asociatieId, funds, pledgedIds);
  } catch (err) {
    reportError(err, { source: 'crowdfundApi.hydrate' });
    store.setFetchError('load');
  }
}

export function createCrowdfundLive(asociatieId: string, fund: Crowdfund): void {
  useCrowdfundStore.getState().addFund(asociatieId, fund);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('crowdfunds').insert({
        id: fund.id,
        asociatie_id: asociatieId,
        title: fund.title,
        description: fund.description,
        target_amount: fund.target_amount,
        deadline: fund.deadline,
      });
    } catch (err) {
      reportError(err, { source: 'crowdfundApi.create' });
    }
  })();
}

export function pledgeLive(
  asociatieId: string,
  crowdfundId: string,
  amount: number,
  userId: string,
): void {
  useCrowdfundStore.getState().pledge(asociatieId, crowdfundId, amount);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('pledges').insert({
        asociatie_id: asociatieId,
        crowdfund_id: crowdfundId,
        user_id: userId,
        amount,
      });
    } catch (err) {
      reportError(err, { source: 'crowdfundApi.pledge' });
    }
  })();
}
