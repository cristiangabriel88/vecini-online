-- vecini.online -- platform team management schema (T251).
--
-- Adds name + email columns to platform_admins so the operator roster can be
-- displayed without joining auth.users (which is not in the public schema).
--
-- Writes to platform_admins continue to go through the service-role-only
-- platform-team-invite / platform-team-revoke Netlify functions (T251).
-- No new client write policy is added; the existing super_admin SELECT policy
-- from T91 already covers roster reads.
--
-- Idempotent: uses IF NOT EXISTS guards.

alter table platform_admins
  add column if not exists name text not null default '',
  add column if not exists email text not null default '';

-- Drop the column defaults so future service-role inserts must supply values
-- explicitly (the default only existed to backfill existing rows).
alter table platform_admins
  alter column name drop default,
  alter column email drop default;
