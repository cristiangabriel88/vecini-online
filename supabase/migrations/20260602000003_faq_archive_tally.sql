-- vecini.online — T186: F07 FAQ admin management + attribution-free vote tally
--
-- The faq_entries table (20260121000002_features.sql) carries standard RLS
-- (members read; admin/presedinte/comitet write). Two additions are needed for
-- the comitet/admin manage UI and the live read path:
--
--   1. `archived` flag — retiring an entry hides it from residents without
--      deleting it (so its vote history is preserved). Members read every row
--      under the existing policy; the app filters archived rows out of the
--      resident view and shows them only in the comitet manage surface.
--
--   2. faq_tally(asociatie) — faq_votes carries the "self faq vote" policy, so a
--      member can read only their OWN vote. Aggregate helpful/not-helpful counts
--      therefore need a SECURITY DEFINER function (the survey_tally/poll_tally
--      precedent, 20260522000020): it reads past RLS to count, returns counts
--      only (never a voter id), and gates on is_member of the owning asociație.
--
-- Additive and idempotent.

alter table faq_entries add column if not exists archived boolean not null default false;

-- helpful / not-helpful counts per FAQ entry for one asociație, attribution-free.
-- STABLE with a fixed search_path so a hostile search_path cannot shadow the
-- source tables (matching is_member/has_role and the existing tally functions).
create or replace function faq_tally(p_asociatie_id uuid)
returns table (faq_id uuid, helpful_count bigint, not_helpful_count bigint)
language sql stable security definer set search_path = public as $$
  select fv.faq_id,
    count(*) filter (where fv.helpful)::bigint as helpful_count,
    count(*) filter (where not fv.helpful)::bigint as not_helpful_count
  from faq_votes fv
  join faq_entries fe on fe.id = fv.faq_id
  where fe.asociatie_id = p_asociatie_id and is_member(fe.asociatie_id)
  group by fv.faq_id;
$$;

grant execute on function faq_tally(uuid) to authenticated;
