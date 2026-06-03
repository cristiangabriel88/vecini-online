-- T224: Server-side hold-back for scheduled announcements.
-- The generic "members read" policy from apply_standard_rls exposes future-scheduled
-- rows to any member. Replace it with a scoped policy that hides rows whose
-- published_at is null and scheduled_at is in the future for non-manager roles.

drop policy if exists "members read" on announcements;

create policy "members read" on announcements for select using (
  is_member(asociatie_id)
  and (
    has_role(asociatie_id, array['admin','presedinte','comitet'])
    or not (published_at is null and scheduled_at > now())
  )
);
