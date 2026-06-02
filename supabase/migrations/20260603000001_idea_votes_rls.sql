-- F14 idea_votes RLS (T194).
-- The original features migration added RLS for `ideas` and `idea_comments` but
-- omitted `idea_votes`, so live vote inserts/reads were blocked for all users.
-- Votes are immutable once cast (matching the T34 voteSignatureRls guard):
-- only SELECT and INSERT are granted; DELETE/UPDATE are intentionally excluded.

alter table idea_votes enable row level security;

create policy "members read idea_votes" on idea_votes for select
  using (
    exists (
      select 1 from ideas i where i.id = idea_id and is_member(i.asociatie_id)
    )
  );

create policy "members insert idea_votes" on idea_votes for insert
  with check (
    exists (
      select 1 from ideas i where i.id = idea_id and is_member(i.asociatie_id)
    )
  );
