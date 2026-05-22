-- IntreVecini — 2FA recovery codes (T02).
-- Single-use backup codes for account recovery when a resident loses access to
-- their authenticator app. Only the SHA-256 hash of each code is ever stored;
-- the plaintext is shown to the resident once at generation and never again.
-- A consumed code is deleted (single-use). TOTP factors themselves are managed
-- by Supabase Auth (auth.mfa_factors), so only the recovery codes need a table.

create table if not exists mfa_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  -- Hex SHA-256 of the normalised (no spaces/dashes, upper-cased) code.
  code_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists mfa_recovery_codes_user_idx on mfa_recovery_codes (user_id);

alter table mfa_recovery_codes enable row level security;

-- A resident manages only their own recovery codes. No admin read path: these
-- are credentials, never visible to anyone else, including association admins.
create policy "self read own recovery codes" on mfa_recovery_codes for select
  using (user_id = auth.uid());

create policy "self create own recovery codes" on mfa_recovery_codes for insert
  with check (user_id = auth.uid());

create policy "self delete own recovery codes" on mfa_recovery_codes for delete
  using (user_id = auth.uid());
