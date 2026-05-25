-- vecini.online — T38: least-privilege RLS for individual response rows
-- (survey_responses, votes, priority_rankings).
--
-- These three tables shipped in 20260121000002_features.sql with the standard
-- "members read · comitet write" RLS (apply_standard_rls). Its "members read"
-- policy lets ANY member of the asociație read EVERY individual row — including
-- the respondent's identity (survey_responses.user_id, votes.voter_user_id,
-- priority_rankings.apartment_id) alongside their choice/ranking. For surveys
-- this directly contradicts surveys.anonymous (default true) and the feature's
-- advertised anonymous polling; for polls and priority rankings it exposes how
-- each neighbour voted/ranked. This is a within-tenant privacy leak (less severe
-- than the cross-tenant T34 gap, but a real one — it leaks who answered what).
--
-- Fix: drop the blanket member-read AND the comitet "for all" grant (which also
-- gives comitet blanket per-row read) on the three tables, and replace them with
-- least-privilege policies:
--   * a respondent reads ONLY their own row;
--   * comitet reads individual rows only where attribution is legitimate — a
--     NAMED (non-anonymous) survey — and never for anonymous surveys, polls or
--     rankings;
--   * inserts stay self-scoped (the existing self-insert policies are kept).
-- Aggregate/tally results stay available to every member through SECURITY
-- DEFINER functions that return counts only, with no per-row attribution.
-- A cast vote / survey response stays immutable (no update/delete policy, like
-- T34); a priority ranking is a revisable preference, so the resident may manage
-- their own apartment's ranking (the event_rsvps "self rsvp" precedent).
--
-- Additive and idempotent: every drop is guarded, every policy/function is
-- re-creatable. The apply_standard_rls('...') calls in the base migration still
-- run first (enabling RLS); this migration only narrows the policies they add.

-- Re-assert RLS is on (idempotent; the base migration already enabled it).
alter table survey_responses enable row level security;
alter table votes enable row level security;
alter table priority_rankings enable row level security;

-- Drop the over-permissive standard policies on all three.
drop policy if exists "members read" on survey_responses;
drop policy if exists "comitet write" on survey_responses;
drop policy if exists "members read" on votes;
drop policy if exists "comitet write" on votes;
drop policy if exists "members read" on priority_rankings;
drop policy if exists "comitet write" on priority_rankings;

-- ── survey_responses (F15) — anonymous by default ───────────────────────────
-- A respondent always reads their own answer. Comitet may read individual
-- answers ONLY for a non-anonymous survey; for an anonymous survey nobody (not
-- even comitet) can read attributed rows — only the aggregate via survey_tally.
-- Insert stays the "member insert own" policy from 20260521000004_feature_ui.sql.
drop policy if exists "self read own survey response" on survey_responses;
create policy "self read own survey response" on survey_responses for select using (
  user_id = auth.uid());

drop policy if exists "comitet read named survey responses" on survey_responses;
create policy "comitet read named survey responses" on survey_responses for select using (
  exists (select 1 from surveys s where s.id = survey_id and s.anonymous = false)
  and has_role(asociatie_id, array['admin','presedinte','comitet']));

-- ── votes (F09) — ballot privacy ────────────────────────────────────────────
-- Polls carry no per-poll secrecy flag, so the privacy-preserving default is
-- ballot secrecy: a voter reads only their own vote; everyone else sees results
-- through poll_tally (counts/weights per option, no voter identity). Insert
-- stays the "self cast vote" policy from 20260121000002_features.sql. No
-- update/delete — a cast vote is immutable (formal AGA votes, which ARE
-- attributable by law, live in aga_votes and keep comitet visibility there).
drop policy if exists "self read own vote" on votes;
create policy "self read own vote" on votes for select using (
  voter_user_id = auth.uid());

-- ── priority_rankings (F13) — per-apartment preference ──────────────────────
-- The ranking is attributed by apartment, not user, so "own row" resolves
-- through apartment_residents. A ranking is a revisable preference list, so the
-- resident may select/insert/update/delete their own apartment's ranking (the
-- single "for all" self policy mirrors event_rsvps' "self rsvp"). Nobody reads
-- another apartment's ranking; the aggregate turnout is exposed via
-- priority_ranking_turnout.
drop policy if exists "self manage priority ranking" on priority_rankings;
create policy "self manage priority ranking" on priority_rankings for all using (
  exists (
    select 1 from apartment_residents ar
    where ar.apartment_id = priority_rankings.apartment_id and ar.user_id = auth.uid()
  )
) with check (
  is_member(asociatie_id)
  and exists (
    select 1 from apartment_residents ar
    where ar.apartment_id = priority_rankings.apartment_id and ar.user_id = auth.uid()
  )
);

-- ── Aggregate tallies (SECURITY DEFINER, attribution-free) ──────────────────
-- Each function reads past RLS to aggregate, but returns counts only (never a
-- user/apartment id) and gates on is_member of the owning asociație, so a member
-- still sees results without seeing who voted/answered what. STABLE; fixed
-- search_path so a hostile search_path cannot shadow the source tables (matching
-- is_member/has_role).

-- survey: number of responses per choice.
create or replace function survey_tally(p_survey_id uuid)
returns table (choice text, responses bigint)
language sql stable security definer set search_path = public as $$
  select sr.choice, count(*)::bigint as responses
  from survey_responses sr
  join surveys s on s.id = sr.survey_id
  where sr.survey_id = p_survey_id and is_member(s.asociatie_id)
  group by sr.choice;
$$;

-- poll: votes and summed weight per selected option (covers yes_no / single /
-- multi choice, which record selections in selected_option_ids). Ranked polls
-- aggregate their ranked_options jsonb at the application layer.
create or replace function poll_tally(p_poll_id uuid)
returns table (option_id uuid, votes bigint, weight_total numeric)
language sql stable security definer set search_path = public as $$
  select opt as option_id, count(*)::bigint as votes, sum(v.weight) as weight_total
  from votes v
  join polls p on p.id = v.poll_id
  cross join lateral unnest(coalesce(v.selected_option_ids, '{}'::uuid[])) as opt
  where v.poll_id = p_poll_id and is_member(p.asociatie_id)
  group by opt;
$$;

-- priority rankings: how many apartments submitted a ranking (turnout), with no
-- exposure of any individual ranking list.
create or replace function priority_ranking_turnout(p_asociatie_id uuid)
returns bigint
language sql stable security definer set search_path = public as $$
  select count(distinct pr.apartment_id)::bigint
  from priority_rankings pr
  where pr.asociatie_id = p_asociatie_id and is_member(pr.asociatie_id);
$$;
