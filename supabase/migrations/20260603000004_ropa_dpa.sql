-- T75: persist ROPA snapshots + DPA adoption records.
--
-- ropa_snapshots: point-in-time art. 30 register snapshots so the controller
-- can prove what processing was in effect on any given date (GDPR accountability).
-- dpa_adoptions: records of the controller formally adopting the art. 28 DPA
-- template (version + who adopted + when).
--
-- Both tables are scoped by asociatie_id. Admin and presedinte can insert;
-- all members of the asociatie can read.

create table if not exists ropa_snapshots (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  generated_at timestamptz not null default now(),
  generated_by_name text not null,
  enabled_keys text[] not null default '{}',
  activities jsonb not null default '[]'
);

create index if not exists ropa_snapshots_asociatie_idx
  on ropa_snapshots(asociatie_id, generated_at desc);

alter table ropa_snapshots enable row level security;

create policy "ropa_snapshots_select_member"
  on ropa_snapshots for select
  using (is_member(asociatie_id));

create policy "ropa_snapshots_insert_admin"
  on ropa_snapshots for insert
  with check (
    has_role(asociatie_id, array['admin', 'presedinte'])
  );

-- ---------------------------------------------------------------------------

create table if not exists dpa_adoptions (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  version text not null,
  adopted_at timestamptz not null default now(),
  adopted_by_name text not null,
  adopted_by_user_id uuid references auth.users(id) on delete set null
);

create index if not exists dpa_adoptions_asociatie_idx
  on dpa_adoptions(asociatie_id, adopted_at desc);

alter table dpa_adoptions enable row level security;

create policy "dpa_adoptions_select_member"
  on dpa_adoptions for select
  using (is_member(asociatie_id));

create policy "dpa_adoptions_insert_admin"
  on dpa_adoptions for insert
  with check (
    has_role(asociatie_id, array['admin', 'presedinte'])
  );
