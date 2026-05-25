-- vecini.online — apartment-reference tenant consistency for parent-scoped
-- junction tables (T71).
--
-- T46 closed cross-tenant references with a COMPOSITE foreign key, but only for
-- child tables that carry their OWN asociatie_id. Several junction/child tables
-- do not carry one (their tenant is known only through a feature parent) yet
-- still reference apartments directly:
--   aga_votes.apartment_id               -> parent agas (via aga_id)
--   aga_attendees.apartment_id           -> parent agas (via aga_id)
--   aga_attendees.proxy_for_apartment_id -> parent agas (via aga_id)
--   budget_votes.apartment_id            -> parent budget_proposals (via proposal_id)
--   idea_votes.apartment_id              -> parent ideas (via idea_id)
--   petition_signatures.apartment_id     -> parent petitions (via petition_id)
-- Nothing stopped, e.g., a vote cast in asociatie A's AGA from naming an
-- apartment in asociatie B, or a petition signature in A from being attributed
-- to a B apartment. The tenant of these rows is the parent's asociatie_id, so the
-- invariant we must hold is: the referenced apartment belongs to the SAME
-- asociatie as the parent row.
--
-- A composite FK (the T46 mechanism) is not available here because the child has
-- no asociatie_id column to tie into the key. We enforce the invariant with a
-- trigger that resolves the parent's asociatie_id and the apartment's
-- asociatie_id and rejects a mismatch. The check runs SECURITY DEFINER with a
-- fixed search_path (like is_member / has_role), so it is unaffected by RLS or a
-- hostile session search_path, and it fires on INSERT and UPDATE. A NULL
-- apartment reference is allowed (optional link), matching the nullable columns.
--
-- Additive and idempotent: each trigger is guarded on pg_trigger, so the
-- migration is safe to re-run.

create or replace function check_apartment_parent_tenant()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  parent_table   text  := tg_argv[0];
  parent_fk_col  text  := tg_argv[1];
  apartment_col  text  := tg_argv[2];
  row_json       jsonb := to_jsonb(new);
  parent_id      uuid  := (row_json ->> parent_fk_col)::uuid;
  apartment_id   uuid  := (row_json ->> apartment_col)::uuid;
  parent_asoc    uuid;
  apartment_asoc uuid;
begin
  -- Optional reference: nothing to keep consistent.
  if apartment_id is null then
    return new;
  end if;

  execute format('select asociatie_id from %I where id = $1', parent_table)
    into parent_asoc using parent_id;
  select asociatie_id into apartment_asoc from apartments where id = apartment_id;

  if parent_asoc is null or apartment_asoc is null or parent_asoc <> apartment_asoc then
    raise exception
      'tenant mismatch on %.%: apartment % is not in the same asociatie as % %',
      tg_table_name, apartment_col, apartment_id, parent_table, parent_id
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

-- Attach the tenant-consistency check to one apartment column of a child table,
-- comparing it against the asociatie_id of the row's parent.
create or replace function add_apartment_tenant_trigger(
  child text, apartment_col text, parent_table text, parent_fk_col text)
returns void language plpgsql as $$
declare
  trg_name text := child || '_' || apartment_col || '_tenant_trg';
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = trg_name and tgrelid = child::regclass and not tgisinternal
  ) then
    execute format(
      'create trigger %I before insert or update on %I '
      || 'for each row execute function check_apartment_parent_tenant(%L, %L, %L)',
      trg_name, child, parent_table, parent_fk_col, apartment_col);
  end if;
end $$;

-- ── F10 AGA digitală ─────────────────────────────────────────────────────────
select add_apartment_tenant_trigger('aga_votes', 'apartment_id', 'agas', 'aga_id');
select add_apartment_tenant_trigger('aga_attendees', 'apartment_id', 'agas', 'aga_id');
select add_apartment_tenant_trigger('aga_attendees', 'proxy_for_apartment_id', 'agas', 'aga_id');

-- ── F12 Buget participativ ───────────────────────────────────────────────────
select add_apartment_tenant_trigger('budget_votes', 'apartment_id', 'budget_proposals', 'proposal_id');

-- ── F14 Idei ─────────────────────────────────────────────────────────────────
select add_apartment_tenant_trigger('idea_votes', 'apartment_id', 'ideas', 'idea_id');

-- ── F16 Petiții ──────────────────────────────────────────────────────────────
select add_apartment_tenant_trigger('petition_signatures', 'apartment_id', 'petitions', 'petition_id');
