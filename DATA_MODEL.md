# Data Model — BlocHub

All tables use `uuid` primary keys (generated via `gen_random_uuid()`), `timestamptz` for all timestamps, and include `created_at`, `updated_at`. Every domain table has `asociatie_id uuid not null references asociatii(id) on delete cascade`. RLS policies enforce isolation.

## Core tables

### `asociatii`
The tenant.
```sql
id uuid pk
name text not null
slug text unique not null            -- url-safe identifier
address text not null
cui text                              -- CIF if registered
registration_number text              -- nr. înregistrare
country text default 'RO'
locale text default 'ro'
timezone text default 'Europe/Bucharest'
currency text default 'RON'
branding jsonb default '{}'           -- logo, primary color, custom strings
settings jsonb default '{}'           -- global settings
created_at, updated_at
deleted_at timestamptz                -- soft delete
```

### `users`
Mirrors Supabase Auth users with profile data.
```sql
id uuid pk (matches auth.users.id)
email text unique
full_name text
phone text
avatar_url text
locale text default 'ro'
notification_preferences jsonb default '{"channels": ["inapp", "telegram", "email"], "quiet_hours": {"start": "22:00", "end": "07:00"}}'
created_at, updated_at
```

### `telegram_users`
Links Telegram identity to BlocHub user.
```sql
id uuid pk
telegram_user_id bigint unique not null
user_id uuid references users(id)
telegram_username text
telegram_first_name text
telegram_last_name text
language_code text
linked_at timestamptz
last_active_at timestamptz
```

### `memberships`
A user's role within an asociație.
```sql
id uuid pk
user_id uuid references users(id) on delete cascade
asociatie_id uuid references asociatii(id) on delete cascade
role text check (role in ('admin','presedinte','comitet','cenzor','proprietar','chirias'))
title text                          -- "Membru comitet", "Vicepreședinte" etc.
joined_at timestamptz default now()
ended_at timestamptz                -- for past members
unique (user_id, asociatie_id, role)
```

### `apartments`
The atomic unit of the building.
```sql
id uuid pk
asociatie_id uuid not null
scara text                          -- "A", "B", "1", etc.
etaj int                            -- 0 = parter, -1 = subsol
numar_apartament text not null
suprafata_utila numeric             -- m²
cota_parte_indiviza numeric         -- decimal fraction, sums to 1.0 within asociație
numar_persoane int default 1
proprietar_principal_name text
is_active boolean default true
notes text
created_at, updated_at
unique (asociatie_id, scara, numar_apartament)
```

### `apartment_residents`
Who lives in (or owns) each apartment.
```sql
id uuid pk
apartment_id uuid references apartments(id) on delete cascade
user_id uuid references users(id)   -- nullable (admin can add residents without accounts)
role text check (role in ('proprietar','chirias','locator')) -- locator = lives there, type unspecified
is_primary boolean default false    -- the "main" contact for this apartment
moved_in_at date
moved_out_at date
```

### `invite_codes`
For binding a Telegram user to an apartment.
```sql
id uuid pk
asociatie_id uuid not null
apartment_id uuid references apartments(id)
code text unique not null           -- 8-char alphanumeric
expires_at timestamptz
consumed_at timestamptz
consumed_by_user_id uuid references users(id)
created_at, created_by uuid references users(id)
```

### `asociatie_features`
Feature flags per tenant.
```sql
id uuid pk
asociatie_id uuid references asociatii(id) on delete cascade
feature_key text not null           -- 'F01', 'F02', ...
enabled boolean default false
config jsonb default '{}'           -- per-feature configuration
unique (asociatie_id, feature_key)
```

### `audit_log`
Every state change.
```sql
id uuid pk
asociatie_id uuid
actor_user_id uuid
actor_role text
entity_type text                    -- 'announcement', 'poll', etc.
entity_id uuid
action text                         -- 'create', 'update', 'delete', 'publish'
before_state jsonb
after_state jsonb
ip_address inet
user_agent text
created_at timestamptz default now()
```

### `notifications`
In-app notifications.
```sql
id uuid pk
asociatie_id uuid
user_id uuid references users(id) on delete cascade
template text                       -- 'announcement.new', 'poll.deadline', ...
title text
body text
link text                           -- in-app deep link
data jsonb
priority text default 'normal' check (priority in ('low','normal','urgent'))
read_at timestamptz
delivered_channels text[]           -- ['inapp','telegram','email']
created_at timestamptz default now()
```

## Per-feature tables (selected highlights — full set per FEATURES.md)

### F01 — Announcements
```sql
announcements (
  id, asociatie_id, author_user_id,
  title, body_html,                   -- rich text
  category text,                      -- urgent | important | informativ | eveniment
  audience jsonb,                     -- {type: 'all'} | {type: 'scara', scari: ['A','B']} | ...
  scheduled_at timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  created_at, updated_at
)
announcement_reads (
  announcement_id, user_id, read_at,
  primary key (announcement_id, user_id)
)
attachments (
  id, asociatie_id,
  related_type text, related_id uuid,  -- polymorphic
  filename, mime_type, size_bytes, storage_path,
  uploaded_by, created_at
)
```

### F09 — Polls
```sql
polls (
  id, asociatie_id, author_user_id,
  title, description,
  poll_type text check (poll_type in ('yes_no','single_choice','multi_choice','ranked')),
  weighted boolean default false,     -- by cota_parte
  quorum_percent int default 0,
  majority_rule text default 'simple', -- simple | absolute | qualified_2_3
  opens_at timestamptz, closes_at timestamptz,
  audience jsonb,
  created_at, published_at, closed_at
)
poll_options (id, poll_id, label, sort_order)
votes (
  id, poll_id, apartment_id,
  voter_user_id,                       -- for audit only
  selected_option_ids uuid[],          -- for multi-choice
  ranked_options jsonb,                -- for ranked
  weight numeric,                      -- cota_parte at time of vote
  cast_at timestamptz default now(),
  unique (poll_id, apartment_id)
)
```

### F17 — Tickets
```sql
tickets (
  id, asociatie_id,
  reporter_user_id, apartment_id,
  title, description,
  category text,                       -- electric, apa, lift, curatenie, ...
  severity text check (severity in ('low','medium','high','critical')),
  location_scara text, location_etaj int, location_description text,
  status text default 'primit' check (status in ('primit','asignat','in_lucru','rezolvat','verificat','inchis','respins')),
  assigned_to_user_id uuid,
  sla_due_at timestamptz,
  resolved_at timestamptz, verified_at timestamptz,
  resolution_notes text,
  rating int check (rating between 1 and 5),
  created_at, updated_at
)
ticket_status_history (id, ticket_id, from_status, to_status, changed_by, notes, changed_at)
```

### F10 — AGA
```sql
agas (
  id, asociatie_id,
  title, scheduled_at, location text, scheduled_online boolean,
  convocator_pdf_path text,
  required_quorum_percent int,
  status text check (status in ('draft','convocata','in_desfasurare','incheiata','anulata')),
  procesverbal_pdf_path text,
  created_at
)
aga_agenda_items (id, aga_id, sort_order, title, description, decision_type text)
aga_attendees (
  id, aga_id, apartment_id, user_id,
  arrived_at, left_at, present boolean,
  is_proxy boolean, proxy_for_apartment_id uuid, proxy_document_path text
)
aga_votes (
  id, aga_id, agenda_item_id, apartment_id,
  decision text check (decision in ('pentru','contra','abtinere')),
  weight numeric, cast_at
)
```

### F25-F27 — Bookings
```sql
bookable_resources (
  id, asociatie_id,
  resource_type text,                 -- laundry, elevator_moving, community_room, terrace, ...
  name, description, capacity int,
  rules jsonb,                        -- max_duration_min, max_per_apartament, advance_days, requires_approval
  is_active boolean
)
bookings (
  id, asociatie_id, resource_id,
  apartment_id, booked_by_user_id,
  starts_at, ends_at,
  purpose text,
  status text check (status in ('pending','approved','rejected','cancelled','completed','no_show')),
  approved_by uuid, approved_at,
  created_at
)
```

(See `FEATURES.md` for the remaining tables. Each feature lists its primary tables.)

## Indexes

Critical indexes for performance:
- All `asociatie_id` columns
- `(asociatie_id, created_at desc)` for feed queries
- `(apartment_id)` on residency tables
- `(user_id, read_at)` on notifications
- `(poll_id, apartment_id)` unique on votes
- GIN indexes on `tsvector` columns for full-text search (announcements, documents, wiki)
- `(telegram_user_id)` on telegram_users
- Partial indexes for `where deleted_at is null` on soft-deleted entities

## RLS policy template

For every domain table:

```sql
alter table <table> enable row level security;

create policy "members can read"
  on <table> for select
  using (
    asociatie_id in (
      select asociatie_id from memberships
      where user_id = auth.uid() and ended_at is null
    )
  );

create policy "comitet can write"
  on <table> for insert
  with check (
    asociatie_id in (
      select asociatie_id from memberships
      where user_id = auth.uid() and role in ('admin','presedinte','comitet')
      and ended_at is null
    )
  );

-- and similar update/delete policies, tightened per feature
```

Resident-owned resources (their own posts, their own bookings) get additional policies allowing the owner to modify their own row.

## Migration strategy

Migrations live in `/supabase/migrations/` with timestamps as filenames: `20260121000001_init_core.sql`, `20260121000002_announcements.sql`, etc.

Run with `npx supabase migration up`. Never edit a committed migration — always add a new one.

## Backups

Supabase handles backups daily. For self-hosted deployments, the deployment guide includes `pg_dump` scripts.
