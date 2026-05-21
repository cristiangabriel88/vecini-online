-- IntreVecini — core multi-tenant schema
-- Every domain table carries asociatie_id and is protected by RLS.

create extension if not exists "pgcrypto";

-- ── Tenant ───────────────────────────────────────────────────────────────
create table asociatii (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  address text not null,
  cui text,
  registration_number text,
  country text not null default 'RO',
  locale text not null default 'ro',
  timezone text not null default 'Europe/Bucharest',
  currency text not null default 'RON',
  branding jsonb not null default '{}',
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ── Users (mirrors auth.users) ───────────────────────────────────────────
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  phone text,
  avatar_url text,
  locale text not null default 'ro',
  notification_preferences jsonb not null default
    '{"channels":["inapp","telegram","email"],"quiet_hours":{"start":"22:00","end":"07:00"}}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table telegram_users (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint unique not null,
  user_id uuid references users(id) on delete set null,
  telegram_username text,
  telegram_first_name text,
  telegram_last_name text,
  language_code text,
  session_state jsonb,
  linked_at timestamptz,
  last_active_at timestamptz
);
create index on telegram_users (telegram_user_id);

-- ── Membership & apartments ──────────────────────────────────────────────
create table memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  role text not null check (role in
    ('super_admin','admin','presedinte','comitet','cenzor','proprietar','chirias')),
  title text,
  joined_at timestamptz not null default now(),
  ended_at timestamptz,
  unique (user_id, asociatie_id, role)
);
create index on memberships (asociatie_id);
create index on memberships (user_id);

create table apartments (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  scara text,
  etaj int,
  numar_apartament text not null,
  suprafata_utila numeric,
  cota_parte_indiviza numeric,
  numar_persoane int not null default 1,
  proprietar_principal_name text,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (asociatie_id, scara, numar_apartament)
);
create index on apartments (asociatie_id);

create table apartment_residents (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references apartments(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  role text not null check (role in ('proprietar','chirias','locator')),
  is_primary boolean not null default false,
  moved_in_at date,
  moved_out_at date
);
create index on apartment_residents (apartment_id);

create table invite_codes (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  apartment_id uuid references apartments(id) on delete cascade,
  code text unique not null,
  expires_at timestamptz,
  consumed_at timestamptz,
  consumed_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  created_by uuid references users(id)
);
create index on invite_codes (asociatie_id);

create table asociatie_features (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default false,
  config jsonb not null default '{}',
  unique (asociatie_id, feature_key)
);
create index on asociatie_features (asociatie_id);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid,
  actor_user_id uuid,
  actor_role text,
  entity_type text,
  entity_id uuid,
  action text,
  before_state jsonb,
  after_state jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index on audit_log (asociatie_id, created_at desc);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid,
  user_id uuid not null references users(id) on delete cascade,
  template text,
  title text,
  body text,
  link text,
  data jsonb not null default '{}',
  priority text not null default 'normal' check (priority in ('low','normal','urgent')),
  read_at timestamptz,
  delivered_channels text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index on notifications (user_id, read_at);

-- ── Helper functions for RLS ─────────────────────────────────────────────
create or replace function is_member(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.user_id = auth.uid() and m.asociatie_id = target and m.ended_at is null
  );
$$;

create or replace function has_role(target uuid, roles text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.user_id = auth.uid() and m.asociatie_id = target
      and m.ended_at is null and m.role = any(roles)
  );
$$;

-- ── RLS for core tables ──────────────────────────────────────────────────
alter table asociatii enable row level security;
create policy "members read asociatie" on asociatii for select using (is_member(id));
create policy "admins update asociatie" on asociatii for update
  using (has_role(id, array['admin','presedinte']));

alter table users enable row level security;
create policy "self read" on users for select using (id = auth.uid());
create policy "self update" on users for update using (id = auth.uid());
create policy "self insert" on users for insert with check (id = auth.uid());

alter table memberships enable row level security;
create policy "read own memberships" on memberships for select using (user_id = auth.uid() or is_member(asociatie_id));
create policy "admins manage memberships" on memberships for all
  using (has_role(asociatie_id, array['admin','presedinte']))
  with check (has_role(asociatie_id, array['admin','presedinte']));

alter table apartments enable row level security;
create policy "members read apartments" on apartments for select using (is_member(asociatie_id));
create policy "admins write apartments" on apartments for all
  using (has_role(asociatie_id, array['admin','presedinte','comitet']))
  with check (has_role(asociatie_id, array['admin','presedinte','comitet']));

alter table apartment_residents enable row level security;
create policy "members read residents" on apartment_residents for select using (
  exists (select 1 from apartments a where a.id = apartment_id and is_member(a.asociatie_id))
);
create policy "admins write residents" on apartment_residents for all using (
  exists (select 1 from apartments a where a.id = apartment_id
          and has_role(a.asociatie_id, array['admin','presedinte','comitet']))
) with check (
  exists (select 1 from apartments a where a.id = apartment_id
          and has_role(a.asociatie_id, array['admin','presedinte','comitet']))
);

alter table invite_codes enable row level security;
create policy "admins manage invite codes" on invite_codes for all
  using (has_role(asociatie_id, array['admin','presedinte','comitet']))
  with check (has_role(asociatie_id, array['admin','presedinte','comitet']));

alter table asociatie_features enable row level security;
create policy "members read features" on asociatie_features for select using (is_member(asociatie_id));
create policy "admins write features" on asociatie_features for all
  using (has_role(asociatie_id, array['admin','presedinte']))
  with check (has_role(asociatie_id, array['admin','presedinte']));

alter table audit_log enable row level security;
create policy "privileged read audit" on audit_log for select
  using (has_role(asociatie_id, array['admin','presedinte','cenzor']));

alter table notifications enable row level security;
create policy "read own notifications" on notifications for select using (user_id = auth.uid());
create policy "update own notifications" on notifications for update using (user_id = auth.uid());

alter table telegram_users enable row level security;
create policy "read own telegram link" on telegram_users for select using (user_id = auth.uid());
