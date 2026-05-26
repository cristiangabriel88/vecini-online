-- vecini.online -- Invite codes: opaque token for server-side link building (T148).
-- The offline InviteCode model (inviteLogic.ts) carries a `token` field -- a
-- 64-char hex string used as the unguessable deep-link identifier carried by
-- onboarding URLs (buildOnboardingLink). Persisting it in the live table lets
-- the `invite-email` Netlify function look up the invite server-side (by id)
-- and build the inviteLink from the stored token, instead of accepting a
-- client-supplied inviteLink -- closing the open-relay risk described in T148.
--
-- Additive and idempotent: re-running is a no-op. The column is nullable so
-- existing rows are unaffected. A partial unique index enforces token
-- uniqueness among non-null values.

alter table invite_codes add column if not exists token text;

drop index if exists invite_codes_token_unique_idx;
create unique index invite_codes_token_unique_idx
  on invite_codes (token)
  where token is not null;
