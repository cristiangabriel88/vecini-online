-- vecini.online — authentication audit-event stream (T03).
-- A privacy-preserving log of security-relevant auth events (sign-in, failed
-- sign-in, temporary lockout, sign-out, password and MFA changes) so a resident
-- can review their own account activity and an association admin has an
-- accountability trail. Append-only by policy (no update/delete grants), which
-- keeps the ordering tamper-evident.
--
-- Privacy: rows never store a password, token, code, or full email. The only
-- identifier is a masked email (e.g. a***@vecini.online), mirroring the
-- client-side `authAudit` model. Offline (demo) mode keeps the log locally.

create table if not exists auth_audit_events (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid references asociatii(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  -- One of the AuthEventType values from src/features/auth/authAudit.ts.
  event_type text not null,
  -- Masked email or null; never a full address.
  email_mask text,
  created_at timestamptz not null default now()
);

create index if not exists auth_audit_events_user_idx
  on auth_audit_events (user_id, created_at desc);
create index if not exists auth_audit_events_asociatie_idx
  on auth_audit_events (asociatie_id, created_at desc);

alter table auth_audit_events enable row level security;

-- A resident reads and appends their own auth events.
create policy "self read own auth audit" on auth_audit_events for select
  using (user_id = auth.uid());

create policy "self append own auth audit" on auth_audit_events for insert
  with check (user_id = auth.uid());

-- Admin / president may review the trail within their association for
-- accountability (read-only; the absence of update/delete policies keeps the
-- log append-only and tamper-evident for everyone, admins included).
create policy "admin read asociatie auth audit" on auth_audit_events for select
  using (asociatie_id is not null and has_role(asociatie_id, array['admin','presedinte']));
