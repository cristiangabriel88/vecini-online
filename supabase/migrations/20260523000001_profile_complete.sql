-- IntreVecini — F66 Profil complet (T11).
-- The rich profile editor keeps the resident's identity in two places, mirroring
-- the offline `profileLogic` model: structured standard fields extend the global
-- `users` row, and any number of user-added typed custom fields live in a new
-- owner-scoped `profile_custom_fields` table.
--
-- `users` is the global identity table (it references auth.users and is NOT
-- tenant-scoped); the per-association apartment link stays in `apartment_residents`,
-- so the profile carries only the resident's free-text scara/etaj and the standard
-- attributes. The profile photo is stored offline as a capped data URL; the live
-- Storage-object path reuses the existing `users.avatar_url` column (a dedicated
-- Storage bucket + RLS is the live-activation follow-up, like F33's T88/T89 split).
--
-- Additive + idempotent: re-running it is a no-op (add column if not exists,
-- create table if not exists, drop-then-create policy).

-- ── Standard profile fields on the global users row ──────────────────────────
alter table users add column if not exists display_name text;
alter table users add column if not exists scara text;
alter table users add column if not exists etaj text;
alter table users add column if not exists car_plate text;
alter table users add column if not exists address text;
alter table users add column if not exists date_of_birth date;
-- Emergency contact as { name, phone, relationship }, mirroring EmergencyContact.
alter table users add column if not exists emergency_contact jsonb not null default '{}';

-- ── User-added custom fields ─────────────────────────────────────────────────
-- field_type and visibility are constrained to exactly the values the app model
-- declares (CUSTOM_FIELD_TYPES / FieldVisibility in profileLogic.ts), so the
-- database refuses anything the editor cannot render.
create table if not exists profile_custom_fields (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  label text not null,
  field_type text not null check (field_type in
    ('text', 'longtext', 'number', 'phone', 'email', 'date', 'bool', 'select', 'link', 'address')),
  value text not null default '',
  options jsonb not null default '[]',
  visibility text not null default 'private' check (visibility in ('private', 'neighbours')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profile_custom_fields_user_idx
  on profile_custom_fields (user_id, sort_order);

alter table profile_custom_fields enable row level security;

-- Owner-only: a resident reads and manages only their own custom fields. Surfacing
-- a "visible to neighbours" field in the F36 directory and admin-side profile
-- viewing are separate live read paths (follow-up tasks), not a wider grant here.
drop policy if exists "self manage own custom fields" on profile_custom_fields;
create policy "self manage own custom fields" on profile_custom_fields for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
