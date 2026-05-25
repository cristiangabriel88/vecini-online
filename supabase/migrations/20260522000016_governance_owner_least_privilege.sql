-- vecini.online — least-privilege owner grants on governance tables (T69, a
-- refinement of the T45 owner-RLS membership tightening).
--
-- apply_owner_rls grants the author a single "owner manage" policy that is a
-- "for all" grant (select/insert/update/delete) on their own row. That is fine
-- for personal rows (a pet, a bike, a marketplace listing): the author owns the
-- record outright. It is too broad for governance/voting tables, where the row
-- stops being purely the author's once other residents act on it:
--   - budget_proposals  — once apartments cast budget_votes on it
--   - ideas             — once apartments cast idea_votes on it
--   - petitions         — once apartments add petition_signatures
-- The cast votes / signatures themselves are already immutable under RLS (T34),
-- but a blanket "owner manage" still lets the author update or delete the parent
-- after the fact, rewriting or erasing the very thing others voted/signed on
-- (and a delete cascades the votes/signatures away with it).
--
-- Fix: replace the blanket "owner manage" on these three tables with
-- operation-scoped owner policies that keep the author in control only while the
-- record is still theirs alone, i.e. while NO vote/signature exists yet:
--   - "owner insert"          — author may create their own row (member of the asociație)
--   - "owner update unlocked" — author may edit it only while it has no votes/signatures
--   - "owner delete unlocked" — author may delete it only while it has no votes/signatures
-- Once anyone has acted, the author can no longer change or remove the shared
-- record; comitet/admin/președinte retain full moderation through the standard
-- "comitet write" (for all) policy, and every member keeps read access through
-- "members read". The lock condition is the existence of a child vote/signature
-- row rather than a per-table status, because that is the uniform, meaningful
-- "others have acted on it" signal across all three (budget_proposals carries no
-- status column of its own). Decision recorded in DECISIONS.md.
--
-- Additive and idempotent: each policy is dropped if present before being
-- (re)created, so the migration can run repeatedly. It only narrows what the
-- owner policy permits; the standard policies are untouched.

create or replace function apply_governance_owner_rls(
  tbl regclass, owner_col text, child_tbl text, child_fk text)
returns void language plpgsql as $$
begin
  -- Remove the blanket "owner manage" (for all) grant and any prior run of the
  -- operation-scoped policies, so the helper is safe to re-run.
  execute format('drop policy if exists "owner manage" on %s', tbl);
  execute format('drop policy if exists "owner insert" on %s', tbl);
  execute format('drop policy if exists "owner update unlocked" on %s', tbl);
  execute format('drop policy if exists "owner delete unlocked" on %s', tbl);

  -- Author may create their own row in an asociație they actively belong to.
  execute format($p$create policy "owner insert" on %s for insert
    with check (%I = auth.uid() and is_member(asociatie_id))$p$, tbl, owner_col);

  -- Author may edit their own row only while no one has voted/signed on it.
  execute format($p$create policy "owner update unlocked" on %1$s for update
    using (%2$I = auth.uid() and is_member(asociatie_id)
           and not exists (select 1 from %3$I where %4$I = %1$s.id))
    with check (%2$I = auth.uid() and is_member(asociatie_id))$p$,
    tbl, owner_col, child_tbl, child_fk);

  -- Author may delete their own row only while no one has voted/signed on it.
  execute format($p$create policy "owner delete unlocked" on %1$s for delete
    using (%2$I = auth.uid() and is_member(asociatie_id)
           and not exists (select 1 from %3$I where %4$I = %1$s.id))$p$,
    tbl, owner_col, child_tbl, child_fk);
end $$;

-- Apply to the three governance/voting tables, each scoped to its vote/signature
-- child via the parent foreign-key column.
select apply_governance_owner_rls('budget_proposals', 'author_user_id', 'budget_votes',        'proposal_id');
select apply_governance_owner_rls('ideas',            'author_user_id', 'idea_votes',          'idea_id');
select apply_governance_owner_rls('petitions',        'author_user_id', 'petition_signatures', 'petition_id');
