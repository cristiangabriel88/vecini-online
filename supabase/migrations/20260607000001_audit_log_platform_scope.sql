-- vecini.online -- T290: allow platform-level audit entries with no asociatie scope.
--
-- The audit_log table originally required a non-null asociatie_id, but platform-
-- level operations (broadcasts, platform-admin grants/revokes) need a shared chain
-- not scoped to any building. This migration:
--  1. Drops the NOT NULL constraint on audit_log.asociatie_id (null = platform scope).
--  2. Adds a partial unique index for the platform chain (asociatie_id IS NULL).
--  3. Fixes audit_log_stamp_seq to use IS NOT DISTINCT FROM so the null-scope
--     chain grows sequentially (null = null is false in SQL with =).
--
-- The FK reference to asociatii(id) is already nullable once NOT NULL is dropped;
-- PostgreSQL foreign keys are null-tolerant.

alter table audit_log alter column asociatie_id drop not null;

-- Partial unique index for the platform-level (null-scope) chain so seq stays
-- sequential and concurrent inserts are rejected cleanly.
create unique index if not exists audit_log_platform_seq_key
  on audit_log (seq)
  where asociatie_id is null;

-- Fix the trigger to handle null asociatie_id with IS NOT DISTINCT FROM.
create or replace function audit_log_stamp_seq()
returns trigger language plpgsql security definer as $$
declare
  tail_seq  bigint;
  tail_hash text;
begin
  select seq, hash
    into tail_seq, tail_hash
    from audit_log
   where asociatie_id is not distinct from NEW.asociatie_id
     and seq is not null
   order by seq desc
   limit 1;

  NEW.seq       := coalesce(tail_seq, 0) + 1;
  NEW.prev_hash := coalesce(tail_hash, '0000000000000000');

  return NEW;
end;
$$;
