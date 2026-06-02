import type { BudgetCycle, BudgetPhase, BudgetProposal } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useBudgetStore } from './budgetStore';

/* Dual-mode participatory budget repository (F12, T192). The zustand store is
   the synchronous source of truth the page reads; these functions apply each
   change there and, when a backend is configured, mirror it to
   `budget_cycles`/`budget_proposals`/`budget_votes` under RLS (members
   read + submit own proposals + cast votes, comitet manage cycles).

   Vote counts are tallied in JS from the raw `budget_votes` rows because
   participatory budgeting votes are not secret (unlike selection polls). The
   demo/offline store stays the default when Supabase is absent. */

const VALID_PHASES: ReadonlySet<string> = new Set(['idei', 'vot', 'incheiat']);

interface CycleRow {
  id: string;
  asociatie_id: string;
  title: string | null;
  pool_amount: number | null;
  phase: string;
  created_at: string;
}

interface ProposalRow {
  id: string;
  cycle_id: string;
  title: string | null;
  cost_estimate: number | null;
  author_user_id: string | null;
  author_name: string | null;
  created_at: string;
}

interface VoteRow {
  proposal_id: string;
  apartment_id: string;
}

function rowToCycle(row: CycleRow, proposals: BudgetProposal[]): BudgetCycle {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    title: row.title ?? '',
    pool: row.pool_amount ?? 0,
    phase: (VALID_PHASES.has(row.phase) ? row.phase : 'idei') as BudgetPhase,
    proposals,
  };
}

function rowToProposal(row: ProposalRow, votes: number): BudgetProposal {
  return {
    id: row.id,
    cycle_id: row.cycle_id,
    title: row.title ?? '',
    cost: row.cost_estimate ?? 0,
    author_name: row.author_name ?? '',
    votes,
    voted: false,
  };
}

/**
 * Hydrate one asociație's budget cycles, proposals and vote counts from the
 * backend. The demo/offline store is kept as the source of truth if the read
 * fails or the backend is absent.
 */
export async function hydrateBudget(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useBudgetStore.getState();
  try {
    const { data: cycles, error: cyclesErr } = await supabase
      .from('budget_cycles')
      .select('id, asociatie_id, title, pool_amount, phase, created_at')
      .eq('asociatie_id', asociatieId)
      .order('created_at', { ascending: false });
    if (cyclesErr || !cycles) {
      reportError(cyclesErr ?? new Error('no data'), { source: 'budgetApi.hydrate.cycles' });
      store.setFetchError('load');
      return;
    }

    const cycleIds = cycles.map((c) => c.id);
    let proposals: ProposalRow[] = [];
    const voteCounts: Record<string, number> = {};

    if (cycleIds.length > 0) {
      const { data: props, error: propsErr } = await supabase
        .from('budget_proposals')
        .select('id, cycle_id, title, cost_estimate, author_user_id, created_at')
        .in('cycle_id', cycleIds)
        .order('created_at', { ascending: true });
      if (propsErr || !props) {
        reportError(propsErr ?? new Error('no data'), { source: 'budgetApi.hydrate.proposals' });
        store.setFetchError('load');
        return;
      }
      proposals = (props as ProposalRow[]).map((p) => ({ ...p, author_name: null }));

      const proposalIds = proposals.map((p) => p.id);
      if (proposalIds.length > 0) {
        const { data: votes, error: votesErr } = await supabase
          .from('budget_votes')
          .select('proposal_id, apartment_id')
          .in('proposal_id', proposalIds);
        if (!votesErr && votes) {
          for (const v of votes as VoteRow[]) {
            voteCounts[v.proposal_id] = (voteCounts[v.proposal_id] ?? 0) + 1;
          }
        }
      }
    }

    const proposalsBycyclists = new Map<string, BudgetProposal[]>();
    for (const p of proposals) {
      const domain = rowToProposal(p, voteCounts[p.id] ?? 0);
      const arr = proposalsBycyclists.get(p.cycle_id) ?? [];
      arr.push(domain);
      proposalsBycyclists.set(p.cycle_id, arr);
    }

    const domainCycles = (cycles as CycleRow[]).map((c) =>
      rowToCycle(c, proposalsBycyclists.get(c.id) ?? []),
    );

    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, domainCycles);
  } catch (err) {
    reportError(err, { source: 'budgetApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Submit a new proposal: apply to the store synchronously (optimistic) then
 * mirror an insert to `budget_proposals` when a backend is configured.
 * The proposal object is built by the caller (BudgetPage) before calling this
 * so the store id and the DB id are the same for the offline path.
 */
export function proposeItem(
  asociatieId: string,
  cycleId: string,
  proposal: BudgetProposal,
  authorUserId: string | null,
): void {
  useBudgetStore.getState().addProposal(asociatieId, cycleId, proposal);
  if (isSupabaseConfigured && authorUserId) {
    void (async () => {
      try {
        await supabase.from('budget_proposals').insert({
          asociatie_id: asociatieId,
          cycle_id: cycleId,
          title: proposal.title,
          cost_estimate: proposal.cost,
          author_user_id: authorUserId,
        });
      } catch (err) {
        reportError(err, { source: 'budgetApi.propose' });
      }
    })();
  }
}

/**
 * Cast a vote: apply to the store synchronously (optimistic) then mirror an
 * insert to `budget_votes` when a backend is configured. The table key is
 * (proposal_id, apartment_id) so one apartment casts one vote per proposal.
 */
export function castBudgetVote(
  asociatieId: string,
  cycleId: string,
  proposalId: string,
  apartmentId: string | null,
): void {
  useBudgetStore.getState().toggleVote(asociatieId, cycleId, proposalId);
  if (isSupabaseConfigured && apartmentId) {
    void (async () => {
      try {
        await supabase.from('budget_votes').insert({ proposal_id: proposalId, apartment_id: apartmentId });
      } catch (err) {
        reportError(err, { source: 'budgetApi.vote' });
      }
    })();
  }
}
