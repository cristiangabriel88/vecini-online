-- vecini.online -- invite_codes: kind + revoked_at (T92).
--
-- Two additive columns required for the T92 provisioning path:
--
--   kind       -- Distinguishes admin-setup invites (issued by the platform
--               provisioning function) from standard resident invites. Nullable
--               so that existing rows are unaffected (null reads as
--               "resident_invite" in application logic). Constrained to the
--               two known values so a typo is caught at the database level.
--               The invite-email.ts function uses this to select the email
--               template; T55 (account-on-redemption) uses it to decide
--               between activateProvisionedAdmin and redeemInvite.
--
--   revoked_at -- The instant the invite was explicitly revoked (by an admin
--               or the platform provisioning function). Already modelled in
--               the shared supabaseAdmin.ts InviteRow interface and checked in
--               the invite-email.ts function; added here so the live schema
--               matches the application code. Null while not revoked.
--
-- Additive and idempotent: "add column if not exists" is a no-op when the
-- migration is re-applied (e.g. supabase db reset).

alter table invite_codes add column if not exists kind text;
alter table invite_codes drop constraint if exists invite_codes_kind_check;
alter table invite_codes add constraint invite_codes_kind_check
  check (kind is null or kind in ('resident_invite', 'admin_setup'));

alter table invite_codes add column if not exists revoked_at timestamptz;
