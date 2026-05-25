-- vecini.online — additive RLS for F10 AGA digitală, built out with UI in batch 5.
-- The base tables (agas, aga_agenda_items, aga_attendees, aga_votes) and their
-- standard "members read · comitet write" RLS already ship in
-- 20260121000002_features.sql.
--
-- An AGA is comitet-convoked, but each proprietar must be able to record their
-- own attendance/proxy and cast their own vote without comitet rights. These
-- policies layer "owner may manage own row" onto the resident-contributed
-- tables so a proprietar can RSVP and vote, scoped through the parent aga's
-- asociație membership.

-- F10 attendance: a member records and updates their own RSVP / proxy row.
create policy "self manage attendance" on aga_attendees for all using (
  user_id = auth.uid()
  and exists (select 1 from agas a where a.id = aga_id and is_member(a.asociatie_id))
) with check (
  user_id = auth.uid()
  and exists (select 1 from agas a where a.id = aga_id and is_member(a.asociatie_id))
);

-- F10 voting: a member casts a vote on an agenda item while the assembly runs.
create policy "self cast aga vote" on aga_votes for insert with check (
  exists (
    select 1 from agas a
    where a.id = aga_id and a.status = 'in_desfasurare' and is_member(a.asociatie_id)
  )
);
