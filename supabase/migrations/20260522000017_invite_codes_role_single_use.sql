-- IntreVecini — invite_codes live parity for the T41 local invite model (T60).
--
-- The offline invite model (src/features/invites/inviteLogic.ts) carries two
-- fields the live invite_codes table (..._init_core.sql) never modelled:
--   - role       — the membership role granted to whoever joins with the code
--                  (one of the invitable roles; founder/platform admin and
--                  super_admin are deliberately NOT invitable)
--   - single_use — whether the first consumption burns the code (the live table
--                  only modelled single-use implicitly via consumed_by_user_id,
--                  with no way to express a reusable code)
-- Without these columns the live persistence in T55 cannot round-trip the full
-- local model, so an issued code would silently lose its granted role and its
-- reusable/single-use intent on the way to Supabase.
--
-- Fix: additively add both columns to invite_codes with safe defaults that
-- match the local model (role defaults to 'proprietar' — the common resident
-- grant; single_use defaults to true — the safe one-shot default). A check
-- constraint restricts role to exactly the invitable roles, mirroring
-- INVITABLE_ROLES so the database refuses a code that would grant a
-- founder/platform role.
--
-- Additive and idempotent: the columns use "add column if not exists" and the
-- check constraint is dropped if present before being (re)created, so the
-- migration is safe to run repeatedly. RLS already covers invite_codes
-- (admin-manage, ..._init_core.sql) and is unchanged.

alter table invite_codes add column if not exists role text not null default 'proprietar';
alter table invite_codes add column if not exists single_use boolean not null default true;

-- Restrict role to the invitable roles only (excludes super_admin and the
-- founder/platform admin, which are not grantable through an invite code).
alter table invite_codes drop constraint if exists invite_codes_role_check;
alter table invite_codes add constraint invite_codes_role_check
  check (role in ('proprietar', 'chirias', 'comitet', 'cenzor', 'presedinte'));
