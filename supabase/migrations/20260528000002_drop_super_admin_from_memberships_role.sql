-- vecini.online -- T111: Remove 'super_admin' from the memberships.role check.
--
-- Context: the platform tier now lives exclusively in `platform_admins` +
-- `is_super_admin()` (added in T91). The original check constraint on
-- memberships.role still listed 'super_admin' as a valid membership role,
-- creating a second, weaker source of truth for the platform tier that:
--   - bypasses the authoritative `platform_admins` roster, and
--   - could in principle let a DB admin grant a tenant membership role of
--     'super_admin', widening in-tenant RLS scope unintentionally.
--
-- Fix: drop and recreate the constraint without 'super_admin'. The six
-- remaining values are the full set of per-asociatie roles. Idempotent:
-- DROP ... IF EXISTS means the migration is safe to run repeatedly.
--
-- No data migration needed -- no production rows carry role = 'super_admin'
-- in memberships because the app has never written them (the demo superadmin
-- persona carries zero memberships by design; see demoTenantContext).

alter table memberships drop constraint if exists memberships_role_check;

alter table memberships add constraint memberships_role_check
  check (role in ('admin','presedinte','comitet','cenzor','proprietar','chirias'));
