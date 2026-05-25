-- vecini.online — cross-feature audit log (T09).
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

-- init_core.sql already creates a bare `audit_log` table (the early
-- before_state/after_state/entity_type stub), so a plain `create table if not
-- exists` here would silently no-op on a fresh `supabase db reset` and leave the
-- tamper-evident columns (entity, entity_label, *_value, seq, prev_hash, hash)
-- missing. This migration therefore UPGRADES whatever audit_log already exists,
-- adding the chain columns idempotently, and only falls back to creating the
-- table when it is somehow absent (standalone runs of this file).
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  actor_user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Bring the older init_core schema up to the tamper-evident chain model. Columns
-- are added nullable so the upgrade never fails on a populated table; the app
-- (auditLogic / auditStore) always supplies them, and RLS is the security floor.
alter table audit_log add column if not exists action text;        -- AuditAction (src/features/audit/auditLogic.ts)
alter table audit_log add column if not exists entity text;        -- AuditEntity (src/features/audit/auditLogic.ts)
alter table audit_log add column if not exists entity_label text;
alter table audit_log add column if not exists before_value text;
alter table audit_log add column if not exists after_value text;
alter table audit_log add column if not exists seq bigint;         -- 1-based position within the asociatie's chain
alter table audit_log add column if not exists prev_hash text;
alter table audit_log add column if not exists hash text;

-- One chain position per asociatie keeps the ordering unambiguous.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'audit_log_asociatie_seq_key'
  ) then
    alter table audit_log
      add constraint audit_log_asociatie_seq_key unique (asociatie_id, seq);
  end if;
end $$;

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
drop policy if exists "admin read asociatie audit" on audit_log;
create policy "admin read asociatie audit" on audit_log for select
  using (has_role(asociatie_id, array['admin','presedinte']));

-- A member appends entries attributed to themselves, within their association.
-- (The actions are admin/comitet operations in practice; the membership +
-- self-actor check is the RLS floor, not the authorization model.)
drop policy if exists "self append asociatie audit" on audit_log;
create policy "self append asociatie audit" on audit_log for insert
  with check (actor_user_id = auth.uid() and is_member(asociatie_id));
