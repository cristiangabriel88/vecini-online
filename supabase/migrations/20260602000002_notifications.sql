-- vecini.online -- In-app notification inbox (T127).
-- One row per notification per recipient; RLS:
--   owner (user_id) may select and update their own rows (to mark read);
--   any authenticated member of the asociatie may insert (enables member-to-admin
--   notifications such as membership.joined from a newly joined proprietar).

create table notifications (
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

create index on notifications (user_id, asociatie_id, created_at desc);
create index on notifications (asociatie_id);

alter table notifications enable row level security;

-- Owner may read their own notifications.
create policy "owner_read" on notifications
  for select using (user_id = auth.uid());

-- Owner may mark their own notifications read (update read_at).
create policy "owner_mark_read" on notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Any authenticated member of the asociatie may insert notifications for
-- recipients in the same asociatie (e.g. a newly joined proprietar notifying
-- the inviting admin via membership.joined).
create policy "member_insert" on notifications
  for insert with check (
    asociatie_id is not null
    and is_member(asociatie_id)
  );

comment on table notifications is
  'In-app notification inbox, one row per recipient per event (T127). '
  'RLS: owner-scoped read/update; any member may insert for the same asociatie.';
