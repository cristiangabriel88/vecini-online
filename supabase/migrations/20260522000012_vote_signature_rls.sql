-- vecini.online — close the tenant-isolation hole on the vote/signature junction
-- tables (T34, the concrete severe instance of T04).
--
-- `budget_votes`, `idea_votes` and `petition_signatures` shipped in
-- 20260121000002_features.sql with RLS NEVER enabled and zero policies. Because
-- Supabase/PostgREST exposes any table reachable through the API, this meant any
-- authenticated user — in any asociație — could read who voted on which budget
-- proposal or idea, and who signed which petition, across every tenant. These
-- junction tables carry no direct `asociatie_id`; they are scoped through their
-- parent (`budget_proposals` / `ideas` / `petitions`), so each policy resolves
-- the owning asociație via the parent row and gates on `is_member(...)`.
--
-- Least privilege: members of the owning asociație may read, and may insert
-- their own vote/signature (one per apartment, enforced by the existing
-- composite primary key). No update or delete policy is granted, so a cast vote
-- or a signature cannot be altered or withdrawn through the API — the absence of
-- those policies denies the operations under RLS. Additive and idempotent.

-- ── budget_votes (parent: budget_proposals) ────────────────────────────────
alter table budget_votes enable row level security;

create policy "members read budget votes" on budget_votes for select using (
  exists (select 1 from budget_proposals p where p.id = proposal_id and is_member(p.asociatie_id)));

create policy "members cast budget vote" on budget_votes for insert with check (
  exists (select 1 from budget_proposals p where p.id = proposal_id and is_member(p.asociatie_id)));

-- ── idea_votes (parent: ideas) ──────────────────────────────────────────────
alter table idea_votes enable row level security;

create policy "members read idea votes" on idea_votes for select using (
  exists (select 1 from ideas i where i.id = idea_id and is_member(i.asociatie_id)));

create policy "members cast idea vote" on idea_votes for insert with check (
  exists (select 1 from ideas i where i.id = idea_id and is_member(i.asociatie_id)));

-- ── petition_signatures (parent: petitions) ─────────────────────────────────
alter table petition_signatures enable row level security;

create policy "members read petition signatures" on petition_signatures for select using (
  exists (select 1 from petitions pt where pt.id = petition_id and is_member(pt.asociatie_id)));

create policy "members sign petition" on petition_signatures for insert with check (
  exists (select 1 from petitions pt where pt.id = petition_id and is_member(pt.asociatie_id)));
