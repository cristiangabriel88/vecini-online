-- IntreVecini — additive schema for features built out with UI in this batch
-- (F15, F24, F29, F37, F48, F54, F57, F65). The base tables and standard/owner
-- RLS already ship in 20260121000002_features.sql; this migration only adds the
-- few columns the new pages need and grants residents insert on the tables
-- where the spec lets any member contribute (visitor logs, survey answers,
-- platform feedback).

-- ── New columns ─────────────────────────────────────────────────────────────
-- F37 Pet directory: lost & found flag + creation time for ordering.
alter table pets add column if not exists lost boolean not null default false;
alter table pets add column if not exists created_at timestamptz not null default now();

-- F57 Marketplace: optional listing category to match the spec's filtering.
alter table marketplace_listings add column if not exists category text;

-- ── Resident-insert RLS ───────────────────────────────────────────────────
-- Lets any association member insert a row they own, while the standard policy
-- keeps select open to members and edit/delete to comitet.
create or replace function apply_member_insert_rls(tbl regclass, owner_col text)
returns void language plpgsql as $$
begin
  execute format($p$create policy "member insert own" on %s for insert
    with check (is_member(asociatie_id) and %I = auth.uid())$p$, tbl, owner_col);
end $$;

select apply_member_insert_rls('visitor_reports', 'reporter_user_id');
select apply_member_insert_rls('survey_responses', 'user_id');

-- platform_feedback may have a null asociatie_id (cross-association feedback to
-- the IntreVecini team), so it gets its own authenticated-insert policy.
create policy "authenticated insert" on platform_feedback for insert
  with check (auth.uid() is not null and (user_id is null or user_id = auth.uid()));
