import type { Poll, PollOption } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { fetchPollTally } from '@/shared/lib/tallyApi';
import { usePollsStore } from './pollsStore';

/* Dual-mode selection-poll repository (F09, T189). The zustand store is the
   synchronous source of truth the page reads; these functions apply each change
   there and, when a backend is configured, mirror it to `polls`/`poll_options`/
   `votes` under RLS (members read + cast their own ballot, comitet create).

   Results never come from reading other members' ballot rows: the running counts
   are aggregated through the attribution-free `poll_tally` RPC (T80), so a member
   sees the tally without seeing who voted what. The demo/offline store stays the
   default when Supabase is absent. */

/** Hydrate one asociație's poll catalog and the per-option counts from the
 *  backend, when configured. The demo store is the source of truth if the read
 *  fails or the backend is absent. */
export async function hydratePolls(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = usePollsStore.getState();
  try {
    const { data: polls, error: pollsErr } = await supabase
      .from('polls')
      .select(
        'id, asociatie_id, author_user_id, title, description, poll_type, weighted, quorum_percent, majority_rule, opens_at, closes_at, audience, created_at, published_at, closed_at',
      )
      .eq('asociatie_id', asociatieId)
      .order('created_at', { ascending: false });
    if (pollsErr || !polls) {
      reportError(pollsErr ?? new Error('no data'), { source: 'pollsApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    const pollIds = polls.map((p) => p.id);
    let options: PollOption[] = [];
    if (pollIds.length > 0) {
      const { data: opts, error: optsErr } = await supabase
        .from('poll_options')
        .select('id, poll_id, label, sort_order')
        .in('poll_id', pollIds);
      if (optsErr || !opts) {
        reportError(optsErr ?? new Error('no data'), { source: 'pollsApi.hydrateOptions' });
        store.setFetchError('load');
        return;
      }
      options = opts as PollOption[];
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, { polls: polls as Poll[], options });

    // Running counts come from the attribution-free aggregate RPC, never from
    // reading individual ballot rows. Merge per poll so a failed tally for one
    // poll does not wipe the others.
    for (const id of pollIds) {
      const tally = await fetchPollTally(id);
      if (tally) {
        const counts: Record<string, number> = {};
        for (const [optionId, t] of Object.entries(tally)) counts[optionId] = t.votes;
        store.mergeCounts(counts);
      }
    }
  } catch (err) {
    reportError(err, { source: 'pollsApi.hydrate' });
    store.setFetchError('load');
  }
}

/** Cast a ballot: applies the vote to the store synchronously (optimistic) and
 *  mirrors it to the `votes` table when a backend is configured and the voter is
 *  linked to an apartment (the table keys ballots per apartment). A subsequent
 *  hydrate reconciles the counts from `poll_tally`. */
export function recordVote(
  asociatieId: string,
  pollId: string,
  optionId: string,
  voterUserId: string,
  apartmentId: string | null,
): void {
  const store = usePollsStore.getState();
  if (store.myVotes[pollId]) return;
  store.vote(pollId, optionId);
  if (isSupabaseConfigured && apartmentId) {
    void (async () => {
      try {
        await supabase.from('votes').insert({
          asociatie_id: asociatieId,
          poll_id: pollId,
          apartment_id: apartmentId,
          voter_user_id: voterUserId,
          selected_option_ids: [optionId],
          weight: 1,
        });
      } catch (err) {
        reportError(err, { source: 'pollsApi.recordVote' });
      }
    })();
  }
}
