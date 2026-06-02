import type { Idea } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useIdeasStore } from './ideasStore';

/* Dual-mode idea-box repository (F14, T194). The zustand store is the
   synchronous source of truth the page reads; these functions apply each
   change there and, when a backend is configured, mirror it to
   `ideas`/`idea_votes` under RLS (members read + submit own ideas + cast
   votes; comitet manage status). Vote counts are tallied in JS from the raw
   `idea_votes` rows since idea-box voting is not secret.
   The demo/offline store stays the default when Supabase is absent. */

interface IdeaRow {
  id: string;
  asociatie_id: string;
  author_user_id: string | null;
  title: string | null;
  body: string | null;
  status: string;
  created_at: string;
}

interface VoteRow {
  idea_id: string;
  apartment_id: string;
}

const VALID_STATUSES = new Set<string>(['in_discutie', 'aprobat', 'implementat', 'respins']);

function rowToIdea(row: IdeaRow, votes: number): Idea {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    author_user_id: row.author_user_id ?? '',
    author_name: '',
    title: row.title ?? '',
    body: row.body ?? '',
    status: (VALID_STATUSES.has(row.status) ? row.status : 'in_discutie') as Idea['status'],
    votes,
    created_at: row.created_at,
  };
}

/**
 * Hydrate one asociație's ideas and vote counts from the backend. The
 * demo/offline store is kept as the source of truth if the read fails or the
 * backend is absent. Vote counts are tallied from `idea_votes` rows in JS
 * (no RPC needed since idea-box votes are not secret).
 */
export async function hydrateIdeas(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useIdeasStore.getState();
  try {
    const { data: ideaRows, error: ideasErr } = await supabase
      .from('ideas')
      .select('id, asociatie_id, author_user_id, title, body, status, created_at')
      .eq('asociatie_id', asociatieId)
      .order('created_at', { ascending: false });
    if (ideasErr || !ideaRows) {
      reportError(ideasErr ?? new Error('no data'), { source: 'ideasApi.hydrate.ideas' });
      store.setFetchError('load');
      return;
    }

    const ideaIds = (ideaRows as IdeaRow[]).map((r) => r.id);
    const voteCounts: Record<string, number> = {};

    if (ideaIds.length > 0) {
      const { data: voteRows, error: votesErr } = await supabase
        .from('idea_votes')
        .select('idea_id, apartment_id')
        .in('idea_id', ideaIds);
      if (!votesErr && voteRows) {
        for (const v of voteRows as VoteRow[]) {
          voteCounts[v.idea_id] = (voteCounts[v.idea_id] ?? 0) + 1;
        }
      }
    }

    const ideas = (ideaRows as IdeaRow[]).map((r) => rowToIdea(r, voteCounts[r.id] ?? 0));
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, ideas);
  } catch (err) {
    reportError(err, { source: 'ideasApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Submit a new idea: apply to the store synchronously (optimistic) then mirror
 * an insert to `ideas` when a backend is configured. The DB assigns its own
 * UUID; the store uses the client-side id for the offline path.
 */
export function submitIdea(
  asociatieId: string,
  idea: Idea,
  authorUserId: string | null,
): void {
  useIdeasStore.getState().addIdea(asociatieId, idea);
  if (isSupabaseConfigured && authorUserId) {
    void (async () => {
      try {
        await supabase.from('ideas').insert({
          asociatie_id: asociatieId,
          author_user_id: authorUserId,
          title: idea.title,
          body: idea.body,
          status: idea.status,
        });
      } catch (err) {
        reportError(err, { source: 'ideasApi.submit' });
      }
    })();
  }
}

/**
 * Cast or retract a vote: apply to the store synchronously (optimistic) then
 * mirror an insert on `idea_votes` when a backend is configured and the user
 * has not yet voted. Votes are immutable in the DB (no DELETE policy, matching
 * the T34 voteSignatureRls guard), so the retract path is offline-only;
 * the live tally is the authoritative count returned by hydrateIdeas.
 */
export function castIdeaVote(
  asociatieId: string,
  ideaId: string,
  apartmentId: string | null,
): void {
  const store = useIdeasStore.getState();
  const currentVoted = store.myVotes[ideaId] ?? false;
  store.toggleVote(asociatieId, ideaId);
  if (isSupabaseConfigured && apartmentId && !currentVoted) {
    void (async () => {
      try {
        await supabase.from('idea_votes').insert({ idea_id: ideaId, apartment_id: apartmentId });
      } catch (err) {
        reportError(err, { source: 'ideasApi.vote' });
      }
    })();
  }
}
