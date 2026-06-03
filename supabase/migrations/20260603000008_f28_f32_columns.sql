-- T215: schema additions and member policies for F28-F32 live activation

-- F28 Parcare: denormalize assignment data onto parking_spots for direct lookup
alter table parking_spots
  add column if not exists apartment_label text,
  add column if not exists license_plate text;

-- F29 Bicicletarie: denormalize owner name + add created_at
alter table bikes
  add column if not exists owner_name text,
  add column if not exists created_at timestamptz not null default now();

-- F30 Boxa: denormalize apartment label for direct lookup
alter table storage_units
  add column if not exists apartment_label text;

-- F31 Plante: denormalize volunteer identity on green_space_tasks
alter table green_space_tasks
  add column if not exists volunteer_user_id uuid references users(id),
  add column if not exists volunteer_name text;

-- F28: members may insert parking spots (admin-managed but kept open for activation)
create policy "parking_spots_member_insert" on parking_spots
  for insert with check (is_member(asociatie_id));

-- F29: members may insert bikes (owner-scoped by apply_owner_rls)
-- owner_rls was already applied; add a member-level update for toggling abandoned
create policy "bikes_member_update" on bikes
  for update using (is_member(asociatie_id)) with check (is_member(asociatie_id));

-- F30: members may insert storage_units (admin-managed)
create policy "storage_units_member_insert" on storage_units
  for insert with check (is_member(asociatie_id));

-- F31: members may insert green_space_tasks and update to sign up/release
create policy "green_tasks_member_insert" on green_space_tasks
  for insert with check (is_member(asociatie_id));
create policy "green_tasks_member_update" on green_space_tasks
  for update using (is_member(asociatie_id)) with check (is_member(asociatie_id));

-- F32: access_codes already have owner insert via apply_owner_rls; no changes needed
