import type { SurveyTally } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from './supabase';
import { reportError } from './errorReporting';

/* Attribution-free tally reads for F09 (Voturi), F15 (Sondaje), F13 (Priorități),
   T80. Under the T38 ballot-secrecy RLS a member can no longer read another
   member's individual vote / survey response / ranking row, so results must come
   from the SECURITY DEFINER aggregate RPCs (survey_tally / poll_tally /
   poll_ranked_tally / priority_ranking_turnout, granted to `authenticated` in
   20260602000004). These helpers call those RPCs behind isSupabaseConfigured and
   return null when the backend is absent or the read fails, so the caller falls
   back to the offline client-side tally and demo mode stays fully working. None
   of these ever expose a voter / respondent / apartment identity. */

interface SurveyTallyRow {
  choice: string;
  responses: number;
}

interface PollTallyRow {
  option_id: string;
  votes: number;
  weight_total: number;
}

interface RankedPollTallyRow {
  option_id: string;
  votes: number;
  rank_total: number;
  weight_total: number;
}

/** Per-option vote count and summed voter weight, keyed by option id. */
export type PollTally = Record<string, { votes: number; weightTotal: number }>;

/** Per-option ballot count, summed rank (lower is a higher collective
 *  preference) and summed weight, keyed by option id. */
export type RankedPollTally = Record<
  string,
  { votes: number; rankTotal: number; weightTotal: number }
>;

/** Aggregate F15 survey responses per choice via the survey_tally RPC.
 *  Returns null offline / on error so the caller keeps its client-side tally. */
export async function fetchSurveyTally(surveyId: string): Promise<SurveyTally | null> {
  if (!isSupabaseConfigured || !surveyId) return null;
  try {
    const { data, error } = await supabase.rpc('survey_tally', { p_survey_id: surveyId });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'tallyApi.survey' });
      return null;
    }
    const tally: SurveyTally = {};
    for (const r of data as SurveyTallyRow[]) tally[r.choice] = Number(r.responses);
    return tally;
  } catch (err) {
    reportError(err, { source: 'tallyApi.survey' });
    return null;
  }
}

/** Aggregate F09 selection-poll votes (yes_no / single / multi) per option via
 *  the poll_tally RPC. Returns null offline / on error. */
export async function fetchPollTally(pollId: string): Promise<PollTally | null> {
  if (!isSupabaseConfigured || !pollId) return null;
  try {
    const { data, error } = await supabase.rpc('poll_tally', { p_poll_id: pollId });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'tallyApi.poll' });
      return null;
    }
    const tally: PollTally = {};
    for (const r of data as PollTallyRow[]) {
      tally[r.option_id] = { votes: Number(r.votes), weightTotal: Number(r.weight_total) };
    }
    return tally;
  } catch (err) {
    reportError(err, { source: 'tallyApi.poll' });
    return null;
  }
}

/** Aggregate F09 ranked-poll ballots per option via the poll_ranked_tally RPC.
 *  Returns null offline / on error. */
export async function fetchPollRankedTally(pollId: string): Promise<RankedPollTally | null> {
  if (!isSupabaseConfigured || !pollId) return null;
  try {
    const { data, error } = await supabase.rpc('poll_ranked_tally', { p_poll_id: pollId });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'tallyApi.pollRanked' });
      return null;
    }
    const tally: RankedPollTally = {};
    for (const r of data as RankedPollTallyRow[]) {
      tally[r.option_id] = {
        votes: Number(r.votes),
        rankTotal: Number(r.rank_total),
        weightTotal: Number(r.weight_total),
      };
    }
    return tally;
  } catch (err) {
    reportError(err, { source: 'tallyApi.pollRanked' });
    return null;
  }
}

/** Number of apartments that submitted an F13 ranking (turnout), via the
 *  priority_ranking_turnout RPC. Returns null offline / on error. */
export async function fetchPriorityTurnout(asociatieId: string): Promise<number | null> {
  if (!isSupabaseConfigured || !asociatieId) return null;
  try {
    const { data, error } = await supabase.rpc('priority_ranking_turnout', {
      p_asociatie_id: asociatieId,
    });
    if (error || data === null || data === undefined) {
      reportError(error ?? new Error('no data'), { source: 'tallyApi.turnout' });
      return null;
    }
    return Number(data);
  } catch (err) {
    reportError(err, { source: 'tallyApi.turnout' });
    return null;
  }
}
