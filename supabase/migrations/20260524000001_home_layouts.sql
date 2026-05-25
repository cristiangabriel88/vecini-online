-- vecini.online — F67 Acasă personalizabil (T12).
-- Each resident customizes their own home screen per asociație: which feature
-- cards they see, in what order, and at what size. The layout is stored as an
-- ordered jsonb array of { card_key, visible, size }, mirroring the offline
-- `homeLayoutLogic` model. When a resident has no row the app falls back to the
-- default layout (the asociație's enabled features, first few shown).
--
-- Additive + idempotent: re-running is a no-op (create table if not exists,
-- enable RLS unconditionally — it is idempotent in Postgres — and drop-then-create
-- the policy).

create table if not exists home_layouts (
  id uuid primary key default gen_random_uuid(),
  resident_user_id uuid not null references users(id) on delete cascade,
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  -- Ordered list of cards: [{ "card_key": "F01", "visible": true, "size": "compact" }, ...]
  cards jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One layout per resident per asociație.
  unique (resident_user_id, asociatie_id)
);

create index if not exists home_layouts_resident_idx
  on home_layouts (resident_user_id, asociatie_id);

alter table home_layouts enable row level security;

-- Owner-only, tenant-scoped: a resident reads and writes only their own layout,
-- and only in an asociație they are an active member of (the T45 owner-RLS
-- tenant tightening, expressed inline since this table predates no helper). No
-- one else can read another resident's home personalization.
drop policy if exists "self manage own home layout" on home_layouts;
create policy "self manage own home layout" on home_layouts for all
  using (resident_user_id = auth.uid() and is_member(asociatie_id))
  with check (resident_user_id = auth.uid() and is_member(asociatie_id));
