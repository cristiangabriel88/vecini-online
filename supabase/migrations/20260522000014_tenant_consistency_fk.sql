-- IntreVecini — parent-child tenant-consistency guards (T46).
--
-- A child row that references a parent row carries its own asociatie_id, and
-- RLS only checks that the actor is a member of the CHILD's asociatie_id. Nothing
-- stopped a child from pointing at a parent in a DIFFERENT asociație (e.g. a
-- discussion_messages row in asociație A whose thread_id points at a thread in
-- asociație B, or a vote attached to a foreign poll/apartment). That is a
-- tenant-isolation gap: data from one building could be stitched onto another's
-- records.
--
-- We close it declaratively with a COMPOSITE foreign key. Every parent that is
-- referenced this way gets a unique (id, asociatie_id) target, and every child
-- gains an FK on (fk_col, asociatie_id) -> parent (id, asociatie_id). Because
-- asociatie_id is part of both sides, the child can only attach to a parent in
-- the SAME asociație. A NULL fk_col (optional link) is not enforced (MATCH
-- SIMPLE), matching the existing nullable references. The composite FK uses the
-- default ON DELETE NO ACTION so it never changes the existing single-column
-- FK's delete behaviour: where the original FK cascades, the child is removed
-- first and this check then passes; where it restricts, the restriction stands.
--
-- Chosen over a per-row trigger: a composite FK is declarative, enforced by the
-- planner, cannot be bypassed, and needs no SECURITY DEFINER. See DECISIONS.md.
--
-- Additive and idempotent: each constraint is guarded on pg_constraint, so the
-- migration is safe to re-run.

create or replace function add_tenant_fk(child text, fk_col text, parent text)
returns void language plpgsql as $$
declare
  parent_uniq text := parent || '_id_asoc_key';
  fk_name text := child || '_' || fk_col || '_asoc_fk';
begin
  -- The composite FK needs a unique (id, asociatie_id) on the parent to target.
  if not exists (
    select 1 from pg_constraint
    where conname = parent_uniq and conrelid = parent::regclass
  ) then
    execute format(
      'alter table %I add constraint %I unique (id, asociatie_id)',
      parent, parent_uniq);
  end if;

  -- Tie the child's tenant to the parent's tenant: a child may only reference a
  -- parent in the same asociatie_id. NULL fk_col -> not enforced (MATCH SIMPLE).
  if not exists (
    select 1 from pg_constraint
    where conname = fk_name and conrelid = child::regclass
  ) then
    execute format(
      'alter table %I add constraint %I foreign key (%I, asociatie_id) '
      || 'references %I (id, asociatie_id)',
      child, fk_name, fk_col, parent);
  end if;
end $$;

-- ── Core ───────────────────────────────────────────────────────────────────
select add_tenant_fk('invite_codes', 'apartment_id', 'apartments');

-- ── F02 Discuții / F04 Mesaje admin ─────────────────────────────────────────
select add_tenant_fk('discussion_messages', 'thread_id', 'discussion_threads');
select add_tenant_fk('private_messages', 'thread_id', 'private_threads');

-- ── F09 Voturi ───────────────────────────────────────────────────────────────
select add_tenant_fk('votes', 'poll_id', 'polls');
select add_tenant_fk('votes', 'apartment_id', 'apartments');

-- ── F12 Buget participativ / F13 Priorități / F14 Idei ──────────────────────
select add_tenant_fk('budget_proposals', 'cycle_id', 'budget_cycles');
select add_tenant_fk('priority_rankings', 'apartment_id', 'apartments');
select add_tenant_fk('idea_comments', 'idea_id', 'ideas');

-- ── F15 Sondaje ──────────────────────────────────────────────────────────────
select add_tenant_fk('survey_responses', 'survey_id', 'surveys');

-- ── F17 Sesizări ─────────────────────────────────────────────────────────────
select add_tenant_fk('tickets', 'apartment_id', 'apartments');

-- ── F18-F24 Maintenance ──────────────────────────────────────────────────────
select add_tenant_fk('maintenance_log', 'maintenance_id', 'scheduled_maintenance');
select add_tenant_fk('meters', 'apartment_id', 'apartments');
select add_tenant_fk('meter_readings', 'meter_id', 'meters');
select add_tenant_fk('rfp_quotes', 'rfp_id', 'rfps');
select add_tenant_fk('contractor_recommendations', 'rfp_id', 'rfps');
select add_tenant_fk('duty_schedule', 'volunteer_id', 'duty_volunteers');
select add_tenant_fk('lending_records', 'item_id', 'lending_items');

-- ── F25-F32 Shared spaces ────────────────────────────────────────────────────
select add_tenant_fk('bookings', 'resource_id', 'bookable_resources');
select add_tenant_fk('bookings', 'apartment_id', 'apartments');
select add_tenant_fk('booking_inspections', 'booking_id', 'bookings');
select add_tenant_fk('parking_assignments', 'spot_id', 'parking_spots');
select add_tenant_fk('parking_assignments', 'apartment_id', 'apartments');
select add_tenant_fk('parking_reports', 'spot_id', 'parking_spots');
select add_tenant_fk('storage_units', 'apartment_id', 'apartments');
select add_tenant_fk('task_signups', 'task_id', 'green_space_tasks');

-- ── F33-F40 Information & records ────────────────────────────────────────────
select add_tenant_fk('supplier_complaints', 'supplier_id', 'suppliers');
select add_tenant_fk('wiki_revisions', 'page_id', 'wiki_pages');
select add_tenant_fk('wiki_suggested_edits', 'page_id', 'wiki_pages');
select add_tenant_fk('pet_markers', 'apartment_id', 'apartments');

-- ── F41-F48 Projects ─────────────────────────────────────────────────────────
select add_tenant_fk('project_phases', 'project_id', 'projects');
select add_tenant_fk('project_updates', 'project_id', 'projects');
select add_tenant_fk('project_updates', 'phase_id', 'project_phases');
select add_tenant_fk('project_photos', 'project_id', 'projects');
select add_tenant_fk('project_photos', 'phase_id', 'project_phases');
select add_tenant_fk('contractor_ratings', 'contractor_id', 'contractors');
select add_tenant_fk('pledges', 'crowdfund_id', 'crowdfunds');

-- ── F49-F56 Safety & compliance ──────────────────────────────────────────────
select add_tenant_fk('psi_checks', 'asset_id', 'psi_assets');
select add_tenant_fk('insurance_claims', 'policy_id', 'insurance_policies');
select add_tenant_fk('key_handovers', 'key_id', 'keys');
select add_tenant_fk('alarm_events', 'system_id', 'alarm_systems');

-- ── F57-F65 Community ────────────────────────────────────────────────────────
select add_tenant_fk('sitter_ratings', 'sitter_id', 'sitter_profiles');
select add_tenant_fk('skill_exchanges', 'offering_id', 'skill_offerings');
select add_tenant_fk('group_buy_signups', 'group_buy_id', 'group_buys');
