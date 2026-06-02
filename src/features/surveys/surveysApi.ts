import type { Survey, SurveyTally } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { fetchSurveyTally } from '@/shared/lib/tallyApi';
import { useSurveysStore } from './surveysStore';

/* Dual-mode survey repository (F15, T195). The zustand store is the synchronous
   source of truth the page reads; these functions apply each change there and,
   when a backend is configured, mirror it to `surveys`/`survey_responses` under
   RLS (members read surveys + insert own anonymous responses).

   Tallies are read via the T80 attribution-free `survey_tally` SECURITY DEFINER
   RPC so no member reads another's individual response row, preserving anonymity.
   The demo/offline store stays the default when Supabase is absent. */

interface SurveyRow {
  id: string;
  asociatie_id: string;
  title: string | null;
  options: string[] | null;
  anonymous: boolean;
  closes_at: string | null;
  created_at: string;
}

function rowToSurvey(row: SurveyRow): Survey {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    title: row.title ?? '',
    options: Array.isArray(row.options) ? row.options : [],
    anonymous: row.anonymous,
    closes_at: row.closes_at,
    created_at: row.created_at,
  };
}

/**
 * Hydrate one asociație's surveys and their anonymous response tallies.
 * Surveys are read under RLS; tallies come from the attribution-free
 * `survey_tally` RPC so individual responses stay private. Falls back to the
 * seeded demo store when the backend is absent.
 */
export async function hydrateSurveys(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useSurveysStore.getState();
  try {
    const { data: rows, error } = await supabase
      .from('surveys')
      .select('id, asociatie_id, title, options, anonymous, closes_at, created_at')
      .eq('asociatie_id', asociatieId)
      .order('created_at', { ascending: false });
    if (error || !rows) {
      reportError(error ?? new Error('no data'), { source: 'surveysApi.hydrate' });
      store.setFetchError('load');
      return;
    }

    const surveys = (rows as SurveyRow[]).map(rowToSurvey);

    const tallies: Record<string, SurveyTally> = {};
    await Promise.all(
      surveys.map(async (sv) => {
        const tally = await fetchSurveyTally(sv.id);
        if (tally) tallies[sv.id] = tally;
      }),
    );

    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, surveys, tallies);
  } catch (err) {
    reportError(err, { source: 'surveysApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Record a survey response: apply to the store synchronously (optimistic) then
 * mirror an insert to `survey_responses` when a backend is configured.
 * The `answered` map prevents double-responses on this device; the DB enforces
 * uniqueness at the RLS/table level for the live path.
 */
export function recordSurveyResponse(
  asociatieId: string,
  surveyId: string,
  choice: string,
  userId: string | null,
): void {
  useSurveysStore.getState().respond(asociatieId, surveyId, choice);
  if (isSupabaseConfigured && userId) {
    void (async () => {
      try {
        await supabase.from('survey_responses').insert({
          asociatie_id: asociatieId,
          survey_id: surveyId,
          user_id: userId,
          choice,
        });
      } catch (err) {
        reportError(err, { source: 'surveysApi.respond' });
      }
    })();
  }
}
