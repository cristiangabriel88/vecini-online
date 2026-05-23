-- IntreVecini — platform superadmin identity + cross-asociatie RLS foundation
-- (T91, the security spine the whole superadmin tier T92/T100/T93-T99 depends on).
--
-- Until now the `super_admin` role existed in the Role type but had no home in
-- the database, and every RLS policy was strictly scoped to a single
-- asociatie_id (via is_member / has_role). This establishes the platform tier:
--
--   1. platform_admins — a platform-WIDE marker (NOT a per-asociatie membership)
--      identifying the handful of accounts that operate the SaaS itself.
--   2. is_super_admin() — a security-definer helper mirroring is_member/has_role,
--      so RLS policies can grant the cross-tenant access the console needs.
--   3. additive, permissive cross-tenant READ policies on the tables the console
--      reads (asociatii, memberships, audit_log). They are SEPARATE permissive
--      policies gated on is_super_admin(), so they widen NO tenant member's scope
--      (Postgres ORs permissive policies; a member's own policies are untouched).
--
-- Least privilege: a platform admin gets cross-tenant READ only. There is no
-- cross-tenant write/update/delete policy anywhere here. Privileged writes
-- (creating an asociatie, provisioning its first admin) run through a
-- service-role server function that re-verifies the caller (T92); the service
-- role bypasses RLS, so platform_admins itself carries no client write policy
-- and cannot be self-escalated from the browser.
--
-- Additive and idempotent: the table uses `create table if not exists`, the
-- helper uses `create or replace`, and every policy is dropped-if-exists before
-- being recreated, so the migration can run repeatedly.

-- ── Platform-wide superadmin roster ──────────────────────────────────────────
-- A row here marks user_id as a platform operator, independent of any asociatie.
-- Deliberately has NO asociatie_id: this is not tenant-scoped data, so it is not
-- covered by is_member / the tenant-consistency guards.
create table if not exists platform_admins (
  user_id uuid primary key references users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  -- Who granted the grant (another platform admin, via the T92 server function).
  granted_by uuid references users(id),
  note text
);

alter table platform_admins enable row level security;

-- Only a platform admin may read the roster; no insert/update/delete policy
-- exists for anyone, so the roster can only be changed by the service role
-- (which bypasses RLS) inside the T92 provisioning function. A normal user can
-- neither see who the platform admins are nor escalate themselves.
drop policy if exists "super admin read platform admins" on platform_admins;
create policy "super admin read platform admins" on platform_admins for select
  using (is_super_admin());

-- ── Helper: is the current user a platform superadmin? ───────────────────────
-- Platform-wide (no asociatie argument), mirroring is_member/has_role: security
-- definer + fixed search_path so a malicious search_path cannot shadow
-- platform_admins, and so the helper reads the roster regardless of RLS (the
-- same definer pattern is_member relies on for memberships).
create or replace function is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from platform_admins p where p.user_id = auth.uid()
  );
$$;

-- ── Cross-tenant READ for the platform console ───────────────────────────────
-- Each is an additional permissive SELECT policy gated on is_super_admin(). It
-- only ever grants when the caller is a platform admin, so it adds platform-wide
-- read without changing what any tenant member can see.

drop policy if exists "super admin read all asociatii" on asociatii;
create policy "super admin read all asociatii" on asociatii for select
  using (is_super_admin());

drop policy if exists "super admin read all memberships" on memberships;
create policy "super admin read all memberships" on memberships for select
  using (is_super_admin());

drop policy if exists "super admin read all audit" on audit_log;
create policy "super admin read all audit" on audit_log for select
  using (is_super_admin());

-- Note: the platform error feed (T96) and usage/health metrics (T97) get the
-- same is_super_admin() read policy when those tables land; they do not exist
-- yet, so no policy is added for them here.
