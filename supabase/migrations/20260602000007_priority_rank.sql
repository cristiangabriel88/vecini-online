-- vecini.online — T193: add rank to project_priorities + member insert policy
-- for priority_rankings so residents can submit personal rankings.
--
-- project_priorities had no ordering column; add `rank` so the comitet can
-- persist the canonical drag-and-drop order. Existing rows are back-filled with
-- their creation-time order per asociație. Additive and idempotent.
--
-- priority_rankings was comitet-write only (apply_standard_rls). Add a member
-- insert policy so any authenticated member can submit their personal ranking;
-- the SECURITY DEFINER priority_ranking_turnout RPC counts distinct apartments
-- without exposing individual rankings.

alter table project_priorities
  add column if not exists rank integer not null default 0;

-- Back-fill existing rows with their per-asociație creation order.
update project_priorities p
set rank = sub.rn
from (
  select id,
    row_number() over (partition by asociatie_id order by created_at) as rn
  from project_priorities
) sub
where p.id = sub.id;

-- Allow any asociație member to insert their personal ranking row.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'priority_rankings' and policyname = 'member submit ranking'
  ) then
    execute $p$create policy "member submit ranking" on priority_rankings
      for insert with check (is_member(asociatie_id))$p$;
  end if;
end $$;
