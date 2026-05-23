-- IntreVecini — cross-feature audit log (T09).
-- An append-only, tamper-evident trail of state changes across the app's admin
-- and content surfaces: who changed what, when, and the before/after value, so
-- an association admin has an accountability record. Mirrors the client-side
-- `auditLogic` model.
--
-- Tamper-evidence:
--  - append-only by policy: NO update or delete grant exists for anyone (admins
--    included), so the ordering cannot be rewritten in place;
--  - each row carries `seq` (1-based, per asociatie), `prev_hash` and `hash`,
--    forming a chain the app re-verifies; editing or reordering a row breaks
--    every hash after it.
--
-- Privacy: a row stores the actor's display name and a short label/value of the
-- affected entity; never a password, token, full email, or other PII.

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  actor_user_id uuid not null references users(id) on delete cascade,
  -- One of the AuditAction values from src/features/audit/auditLogic.ts.
  action text not null,
  -- One of the AuditEntity values from src/features/audit/auditLogic.ts.
  entity text not null,
  entity_label text not null,
  before_value text,
  after_value text,
  -- 1-based position within the asociatie's chain.
  seq bigint not null,
  prev_hash text not null,
  hash text not null,
  created_at timestamptz not null default now(),
  -- One chain position per asociatie keeps the ordering unambiguous.
  unique (asociatie_id, seq)
);

create index if not exists audit_log_asociatie_seq_idx
  on audit_log (asociatie_id, seq desc);
create index if not exists audit_log_asociatie_created_idx
  on audit_log (asociatie_id, created_at desc);
create index if not exists audit_log_actor_idx
  on audit_log (actor_user_id, created_at desc);

alter table audit_log enable row level security;

-- Admin / president read the trail for their association (read-only). The
-- absence of any update/delete policy keeps the log append-only and
-- tamper-evident for everyone, admins included.
create policy "admin read asociatie audit" on audit_log for select
  using (has_role(asociatie_id, array['admin','presedinte']));

-- A member appends entries attributed to themselves, within their association.
-- (The actions are admin/comitet operations in practice; the membership +
-- self-actor check is the RLS floor, not the authorization model.)
create policy "self append asociatie audit" on audit_log for insert
  with check (actor_user_id = auth.uid() and is_member(asociatie_id));
