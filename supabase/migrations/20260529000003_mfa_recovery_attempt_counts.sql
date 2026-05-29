-- vecini.online -- T81: server-backed recovery-code attempt counting.
--
-- Provides a globally persistent attempt counter for the mfa-recovery-verify
-- Netlify function (T29), replacing the per-Lambda-instance in-memory store.
-- Records failed recovery-code verification attempts per (user_id, session_id)
-- so the brute-force budget cannot be reset by clearing localStorage or routing
-- to a fresh Lambda instance. SERVICE-ROLE-ONLY (no client RLS policies).

create table if not exists mfa_recovery_attempt_counts (
  user_id     uuid  not null references users(id) on delete cascade,
  session_id  text  not null,
  -- Number of failed recovery-code attempts for this session.
  attempts    int   not null default 0,
  primary key (user_id, session_id)
);

create index if not exists mfa_recovery_attempt_counts_user_idx
  on mfa_recovery_attempt_counts (user_id);

alter table mfa_recovery_attempt_counts enable row level security;
-- No RLS policies: service-role-only. The mfa-recovery-verify Netlify function
-- accesses this table via the service-role client (supabaseAdmin). Deny-all for
-- all client roles is correct -- no browser should read or write attempt counts.

-- Atomic increment: inserts the first attempt (= 1) or increments an existing
-- counter. Returns the new attempt count so the caller can check the ceiling in
-- one round-trip. Only the service-role Netlify function should call this.
create or replace function increment_recovery_attempts(
  p_user_id    uuid,
  p_session_id text
)
returns int
language sql
security definer
set search_path = public
as $$
  insert into mfa_recovery_attempt_counts (user_id, session_id, attempts)
  values (p_user_id, p_session_id, 1)
  on conflict (user_id, session_id)
  do update set attempts = mfa_recovery_attempt_counts.attempts + 1
  returning attempts;
$$;

-- Revoke the default PUBLIC grant (defence-in-depth). The service-role bypasses
-- this and can execute the function regardless.
revoke all on function increment_recovery_attempts(uuid, text) from public;
