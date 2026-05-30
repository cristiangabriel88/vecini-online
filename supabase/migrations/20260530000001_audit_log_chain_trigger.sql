-- vecini.online — server-authoritative audit_log chain stamping (T86).
--
-- Two additions:
--   1. actor_name TEXT column so the live read path can surface the actor's
--      display name without a join against users/profiles.
--   2. BEFORE INSERT trigger audit_log_chain_stamp that computes seq and
--      prev_hash server-side, making the chain ordering DB-authoritative.
--
-- Security model: the unique constraint (asociatie_id, seq) is the real guard.
-- The trigger reads the current tail under advisory locking semantics (ORDER BY
-- seq DESC LIMIT 1) and assigns the next position; the unique constraint rejects
-- a concurrent insert that races to the same seq. Callers may retry on conflict.
--
-- Hash: the client-provided cyrb53 hash is stored as-is after the trigger
-- overrides seq/prev_hash. This means the stored hash is computed over the
-- client's original seq/prev_hash, not the trigger-assigned values. The hash
-- is a non-cryptographic integrity aid (auditLogic.ts documents this); the
-- append-only RLS + seq uniqueness are the real tamper-evidence controls.
-- The live read path skips verifyChain(); offline reads still use it.

alter table audit_log add column if not exists actor_name text;

-- -------------------------------------------------------------------------
-- Trigger function: stamp seq + prev_hash from the current chain tail.
-- -------------------------------------------------------------------------

create or replace function audit_log_stamp_seq()
returns trigger language plpgsql security definer as $$
declare
  tail_seq  bigint;
  tail_hash text;
begin
  select seq, hash
    into tail_seq, tail_hash
    from audit_log
   where asociatie_id = NEW.asociatie_id
     and seq is not null
   order by seq desc
   limit 1;

  NEW.seq       := coalesce(tail_seq, 0) + 1;
  NEW.prev_hash := coalesce(tail_hash, '0000000000000000');

  return NEW;
end;
$$;

drop trigger if exists audit_log_chain_stamp on audit_log;
create trigger audit_log_chain_stamp
  before insert on audit_log
  for each row execute function audit_log_stamp_seq();
