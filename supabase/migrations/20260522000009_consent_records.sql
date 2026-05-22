-- IntreVecini — GDPR consent records (T05).
-- Stores the "who consented to what, when, version" trail required to evidence
-- valid consent under art. 7 GDPR. Append-only from the resident's side; the
-- active choice is the most recent row. Mirrors the client-side consent store
-- when a backend is configured. Offline (demo) mode keeps the trail locally.

create table if not exists consent_records (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid references asociatii(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  -- { necessary, preferences, analytics, marketing } booleans
  choices jsonb not null,
  policy_version int not null,
  created_at timestamptz not null default now()
);

create index if not exists consent_records_user_idx on consent_records (user_id, created_at desc);
create index if not exists consent_records_asociatie_idx on consent_records (asociatie_id);

alter table consent_records enable row level security;

-- A resident reads and appends their own consent decisions.
create policy "self read own consent" on consent_records for select
  using (user_id = auth.uid());

create policy "self record own consent" on consent_records for insert
  with check (user_id = auth.uid());

-- Admin / president can review the consent trail for accountability within
-- their association (read-only; they can never forge a resident's consent).
create policy "admin read asociatie consent" on consent_records for select
  using (asociatie_id is not null and has_role(asociatie_id, array['admin','presedinte']));
