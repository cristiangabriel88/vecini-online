-- vecini.online -- T120: cross-tenant read for auth_audit_events (dormant signal).
--
-- The platform console computes the "last admin sign-in" field per asociatie to
-- surface a dormant badge on the asociatii list page. This requires reading
-- auth_audit_events across all tenants, which the T91 super_admin RLS did not
-- include (only asociatii / memberships / audit_log were covered there).
--
-- Additive and idempotent: drop-if-exists before recreating.

drop policy if exists "super admin read all auth audit events" on auth_audit_events;
create policy "super admin read all auth audit events" on auth_audit_events for select
  using (is_super_admin());
