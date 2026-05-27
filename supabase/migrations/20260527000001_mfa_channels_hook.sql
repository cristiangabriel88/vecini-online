-- vecini.online — App-managed 2FA channels + session elevation schema (T141).
--
-- This migration adds the three tables and the Custom Access Token Hook that
-- together give the email and Telegram second-factor channels the same
-- tamper-proof JWT elevation that native TOTP achieves through Supabase Auth.
--
-- Background (see DECISIONS.md "Easier 2FA for non-technical users"):
-- Supabase Auth only elevates the native `aal` claim for TOTP and phone factors.
-- Email OTP and Telegram OTP are app-managed: a service-role Netlify function
-- (T142) verifies the code, then writes a `session_elevations` row. The Custom
-- Access Token Hook reads that row on every token refresh and injects
-- `app_2fa_at` (epoch) + `app_2fa_channel` claims so the client gate and future
-- RLS policies can trust these claims without a separate lookup.
--
-- TABLES
-- ──────
-- mfa_channels          — which channels a user has enabled (self-managed).
-- mfa_otp_challenges    — hashed OTP challenges issued per channel/session.
--                         SERVICE-ROLE-ONLY: no client policies, so hashes are
--                         never readable by a browser client.
-- session_elevations    — one row per elevated session; read by the hook.
--                         SERVICE-ROLE-ONLY: the hook runs as the function
--                         owner (SECURITY DEFINER) and reads this table
--                         directly via the service-role grant.
--
-- HOOK
-- ────
-- custom_access_token_hook(event jsonb) — a SECURITY DEFINER function with a
--   locked search_path granted ONLY to `supabase_auth_admin`. On every JWT
--   refresh, Supabase Auth calls this function (once the hook is enabled in the
--   dashboard) and the function merges the app-managed claims.
--
-- LIVE ACTIVATION (manual step, NOT an overnight blocker):
--   Authentication > Hooks > "Customize Access Token (JWT) Claims"
--   Select schema: public, function: custom_access_token_hook.
--   This must be done in the Supabase dashboard after applying the migration.
--   The migration is entirely inert (no-op at runtime) until the hook is
--   registered. Demo mode is unchanged; no code path reads these claims offline.

-- ── mfa_channels ──────────────────────────────────────────────────────────
-- Records which second-factor channels a user has enabled. Only a masked hint
-- is stored (e.g. 'io***@example.com', '@my***user') so the UI can confirm
-- the linked address/account without exposing the full value. The actual target
-- is resolved at OTP-request time by the service-role function (T142).

create table if not exists mfa_channels (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references users(id) on delete cascade,
  channel       text        not null check (channel in ('email', 'telegram')),
  enabled_at    timestamptz not null default now(),
  -- Masked hint displayed in the UI. Full address never stored here.
  target_hint   text        not null,
  unique (user_id, channel)
);

create index if not exists mfa_channels_user_idx on mfa_channels (user_id);

alter table mfa_channels enable row level security;

-- A user manages only their own channels. No admin or asociatie read path:
-- which second factors someone has enrolled is a personal credential, not a
-- tenant-scoped record.
create policy "self read own mfa channels" on mfa_channels for select
  using (user_id = auth.uid());

create policy "self create own mfa channels" on mfa_channels for insert
  with check (user_id = auth.uid());

create policy "self delete own mfa channels" on mfa_channels for delete
  using (user_id = auth.uid());

-- ── mfa_otp_challenges ────────────────────────────────────────────────────
-- Stores in-flight OTP challenges issued by the service-role function (T142).
-- Only code hashes (never plaintext codes) are stored. SERVICE-ROLE-ONLY:
-- no client RLS policies so authenticated/anon clients cannot read the hashes
-- even via PostgREST. RLS on + zero policies = deny-all for client roles.

create table if not exists mfa_otp_challenges (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references users(id) on delete cascade,
  channel             text        not null check (channel in ('email', 'telegram')),
  -- HMAC-SHA256 of the 6-digit code (hex), salted with code_salt.
  code_hash           text        not null,
  code_salt           text        not null,
  -- SHA-256 hash of the one-time click-to-confirm token (email only; null for Telegram).
  confirm_token_hash  text,
  created_at          timestamptz not null default now(),
  expires_at          timestamptz not null,
  consumed_at         timestamptz,
  -- Incremented on each failed verification attempt; used for server-side lockout.
  attempts            integer     not null default 0,
  -- Supabase session id this challenge is bound to. Scopes the challenge to one
  -- browser session so a leaked code cannot be used from another device.
  session_id          text        not null
);

create index if not exists mfa_otp_challenges_user_idx on mfa_otp_challenges (user_id);
create index if not exists mfa_otp_challenges_session_idx on mfa_otp_challenges (session_id);

alter table mfa_otp_challenges enable row level security;
-- No RLS policies: service-role-only. The T142 Netlify function accesses this
-- table via the service-role client (supabaseAdmin); no browser client should
-- ever read or write challenge rows. Deny-all is correct.

-- ── session_elevations ────────────────────────────────────────────────────
-- Authoritative record of sessions that have passed an app-managed second
-- factor. Written by the T142 OTP-verify function; read by the Custom Access
-- Token Hook below. SERVICE-ROLE-ONLY (same rationale as mfa_otp_challenges).

create table if not exists session_elevations (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references users(id) on delete cascade,
  -- One row per session; unique so an upsert is atomic.
  session_id    text        not null unique,
  -- The channel that satisfied the second factor ('email', 'telegram', 'recovery').
  channel       text        not null check (channel in ('email', 'telegram', 'recovery')),
  elevated_at   timestamptz not null default now(),
  expires_at    timestamptz not null
);

create index if not exists session_elevations_session_idx on session_elevations (session_id);
create index if not exists session_elevations_user_idx on session_elevations (user_id);

alter table session_elevations enable row level security;
-- No RLS policies: service-role-only. See mfa_otp_challenges comment above.

-- ── Custom Access Token Hook ──────────────────────────────────────────────
-- Called by Supabase Auth on every JWT issuance/refresh (once registered in
-- the dashboard). Reads the session_elevations table and merges:
--   app_2fa_at      — epoch seconds when the second factor was verified
--   app_2fa_channel — which channel satisfied the factor
-- into the JWT claims alongside the native Supabase claims.
--
-- SECURITY properties:
--   SECURITY DEFINER  — runs as the function owner (postgres/superuser) so it
--                        can read session_elevations without a client JWT.
--   set search_path   — locked to the empty string to prevent search-path
--                        injection: any unqualified name references will fail,
--                        forcing all objects to be schema-qualified.
--   revoke from public — the default is to grant execute to PUBLIC; we revoke
--                        that first and grant only to supabase_auth_admin.
--   supabase_auth_admin — the internal Supabase Auth role that calls hooks.
--
-- LIVE ACTIVATION (see above): this function is inert until the hook is
-- registered in Authentication > Hooks > Customize Access Token (JWT) Claims.

create or replace function custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  sid       text;
  elevation record;
  claims    jsonb;
begin
  -- Extract the session_id from the incoming JWT claims. Supabase includes
  -- this for all browser sessions; it is absent for service-role calls, in
  -- which case we return the event unchanged.
  sid := event -> 'claims' ->> 'session_id';

  if sid is null or sid = '' then
    return event;
  end if;

  -- Look up the freshest, non-expired elevation for this session.
  select channel, elevated_at
    into elevation
    from public.session_elevations
   where session_id = sid
     and expires_at > now()
   order by elevated_at desc
   limit 1;

  -- No elevation found: return the event unchanged so the native claims are
  -- not disturbed. This is the common case for sessions that used TOTP or have
  -- not completed a second factor yet.
  if not found then
    return event;
  end if;

  -- Merge the app-managed 2FA claims into the existing claims object.
  claims := coalesce(event -> 'claims', '{}'::jsonb)
         || jsonb_build_object(
              'app_2fa_at',      extract(epoch from elevation.elevated_at)::bigint,
              'app_2fa_channel', elevation.channel
            );

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Revoke the default PUBLIC grant so unauthenticated callers cannot invoke
-- the hook directly (defence-in-depth on top of the SECURITY DEFINER).
revoke all on function custom_access_token_hook(jsonb) from public;

-- Grant execute only to the Supabase Auth internal role. This is the only
-- role that should ever call this function; all other roles are denied.
grant execute on function custom_access_token_hook(jsonb) to supabase_auth_admin;
