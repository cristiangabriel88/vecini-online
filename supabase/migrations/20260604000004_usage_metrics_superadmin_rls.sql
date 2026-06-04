-- vecini.online -- T97: cross-tenant read for activity tables (usage/health metrics)
--
-- The platform usage page aggregates recent announcements, tickets and votes
-- per asociatie (30-day window) to drive the health/adoption dashboard.
-- These tables are normally member-scoped; this migration adds super_admin
-- SELECT policies so the platform API can run cross-tenant counts.
--
-- Additive and idempotent: drop-if-exists before recreating.

drop policy if exists "super_admin_read_announcements" on announcements;
create policy "super_admin_read_announcements"
  on announcements
  for select
  to authenticated
  using (is_super_admin());

drop policy if exists "super_admin_read_tickets" on tickets;
create policy "super_admin_read_tickets"
  on tickets
  for select
  to authenticated
  using (is_super_admin());

drop policy if exists "super_admin_read_votes" on votes;
create policy "super_admin_read_votes"
  on votes
  for select
  to authenticated
  using (is_super_admin());
