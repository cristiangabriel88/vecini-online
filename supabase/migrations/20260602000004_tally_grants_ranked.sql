-- vecini.online — T80: grant + extend the attribution-free tally functions
-- for F09 (Voturi), F15 (Sondaje), F13 (Priorități).
--
-- 20260522000020_response_privacy.sql (T38) created the SECURITY DEFINER
-- aggregates survey_tally / poll_tally / priority_ranking_turnout so a member
-- can see results without reading another member's individual row, but it never
-- granted EXECUTE to the `authenticated` role, so the live read path could not
-- call them (the faq_tally precedent, 20260602000003, does grant). Two gaps are
-- closed here:
--
--   1. grant EXECUTE on the three T38 aggregates to `authenticated`, matching
--      faq_tally, so the live F09/F15/F13 read paths can invoke them.
--
--   2. poll_tally only aggregates the `selected_option_ids` poll types
--      (yes_no / single / multi). Ranked polls record their order in the
--      `ranked_options` jsonb (option_id -> 1-based rank, lower = higher
--      preference) and were left "aggregate at the application layer" — but under
--      the T38 ballot-secrecy RLS a member can no longer read other voters' rows,
--      so the client cannot aggregate them either. Add a sibling
--      poll_ranked_tally that aggregates the jsonb attribution-free: per option,
--      how many ballots ranked it, the summed rank (a Borda-style score input)
--      and the summed weight. Lower rank_total at equal vote counts means a
--      higher collective preference.
--
-- Both new pieces follow the T38 shape: STABLE, security definer, fixed
-- search_path so a hostile search_path cannot shadow the source tables, gated on
-- is_member of the owning asociație, and never projecting a voter identity.
-- Additive and idempotent.

-- 1. EXECUTE grants for the existing T38 aggregates (was missing).
grant execute on function survey_tally(uuid) to authenticated;
grant execute on function poll_tally(uuid) to authenticated;
grant execute on function priority_ranking_turnout(uuid) to authenticated;

-- 2. Ranked-poll aggregate over the ranked_options jsonb. Each ballot contributes
-- one (option_id -> rank) pair per ranked option; we count ballots, sum the ranks
-- (lower is better) and sum the voter weight, with no per-voter exposure.
create or replace function poll_ranked_tally(p_poll_id uuid)
returns table (option_id uuid, votes bigint, rank_total numeric, weight_total numeric)
language sql stable security definer set search_path = public as $$
  select (kv.key)::uuid as option_id,
    count(*)::bigint as votes,
    sum((kv.value)::numeric) as rank_total,
    sum(v.weight) as weight_total
  from votes v
  join polls p on p.id = v.poll_id
  cross join lateral jsonb_each_text(coalesce(v.ranked_options, '{}'::jsonb)) as kv
  where v.poll_id = p_poll_id and is_member(p.asociatie_id)
  group by kv.key;
$$;

grant execute on function poll_ranked_tally(uuid) to authenticated;
