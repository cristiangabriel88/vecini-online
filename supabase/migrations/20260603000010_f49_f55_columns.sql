-- T218: add missing columns for F49-F55 live activation + member-insert policies

-- F50: evacuation_plans needs route description + equipment jsonb + updated_at
alter table evacuation_plans
  add column if not exists route text,
  add column if not exists equipment jsonb not null default '[]',
  add column if not exists updated_at timestamptz not null default now();

-- F50: pet_markers needs apartment_label (denorm) + user_id (owner)
alter table pet_markers
  add column if not exists apartment_label text,
  add column if not exists user_id uuid references users(id);

-- F53: keys needs denormalized holder_name (app layer uses name, not FK)
alter table keys
  add column if not exists holder_name text;

-- F54: visitor_reports needs denormalized reporter_name
alter table visitor_reports
  add column if not exists reporter_name text;

-- F54: any asociatie member may submit a visitor report
create policy "visitor_reports_member_insert" on visitor_reports
  for insert with check (is_member(asociatie_id));

-- F50: residents may manage their own pet marker (insert / update / delete)
create policy "pet_markers_owner_manage" on pet_markers
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
