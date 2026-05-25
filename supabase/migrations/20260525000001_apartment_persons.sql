-- vecini.online — Apartment registry: named occupants (T-apartments-crud).
-- The admin configures the building's units (add/edit) before residents hold
-- accounts, so each apartment carries an embedded list of named occupants
-- mirroring the ApartmentPerson model in domain.ts: { id, name, role, is_primary }.
--
-- This is separate from `apartment_residents` (account-linked residency, keyed by
-- user_id): see DECISIONS.md. The headline `numar_persoane` count already exists
-- on the row and stays editable independently of this list.
--
-- Additive + idempotent: re-running is a no-op. Writes are already covered by the
-- existing "admins write apartments" RLS policy (init_core.sql), so no new policy
-- is needed.

alter table apartments add column if not exists persons jsonb not null default '[]'::jsonb;
