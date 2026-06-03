-- vecini.online -- In-app notification inbox (T127).
-- One row per notification per recipient; RLS:
--   owner (user_id) may select and update their own rows (to mark read);
--   any authenticated member of the asociatie may insert (enables member-to-admin
--   notifications such as membership.joined from a newly joined proprietar).
--
-- Production-safe: table may already exist with an older shape; CREATE TABLE IF
-- NOT EXISTS is a no-op in that case. Missing columns are then reconciled via
-- ALTER TABLE ... ADD COLUMN IF NOT EXISTS so existing data is preserved.

create table if not exists public.notifications (
  id             text primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  asociatie_id   uuid references asociatii(id) on delete cascade,
  kind           text not null check (kind in ('membership.joined', 'announcement.published', 'generic')),
  title          text not null default '',
  body           text not null default '',
  link           text,
  priority       text not null default 'normal' check (priority in ('low', 'normal', 'urgent')),
  read_at        timestamptz,
  created_at     timestamptz not null default now(),
  data           jsonb not null default '{}'
);

-- Reconcile columns that may be absent from an older table shape.
-- The default values ensure the statement is safe even when existing rows are present.
alter table public.notifications add column if not exists kind         text not null default 'generic';
alter table public.notifications add column if not exists title        text not null default '';
alter table public.notifications add column if not exists body         text not null default '';
alter table public.notifications add column if not exists link         text;
alter table public.notifications add column if not exists priority     text not null default 'normal';
alter table public.notifications add column if not exists read_at      timestamptz;
alter table public.notifications add column if not exists data         jsonb not null default '{}';

create index if not exists notifications_user_assoc_created_idx
  on public.notifications (user_id, asociatie_id, created_at desc);
create index if not exists notifications_asociatie_idx
  on public.notifications (asociatie_id);

alter table public.notifications enable row level security;

-- Owner may read their own notifications.
do $$ begin
  create policy "owner_read" on public.notifications
    for select using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- Owner may mark their own notifications read (update read_at).
do $$ begin
  create policy "owner_mark_read" on public.notifications
    for update using (user_id = auth.uid())
    with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- Any authenticated member of the asociatie may insert notifications for
-- recipients in the same asociatie (e.g. a newly joined proprietar notifying
-- the inviting admin via membership.joined).
do $$ begin
  create policy "member_insert" on public.notifications
    for insert with check (
      asociatie_id is not null
      and is_member(asociatie_id)
    );
exception when duplicate_object then null;
end $$;

comment on table public.notifications is
  'In-app notification inbox, one row per recipient per event (T127). '
  'RLS: owner-scoped read/update; any member may insert for the same asociatie.';
