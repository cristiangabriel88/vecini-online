-- vecini.online -- Per-user notification email preferences (T14).
-- Stores each resident's email-channel opt-in and quiet-hours window.
-- RLS: owner-scoped read/write; service-role reads in notify-email function.

create table if not exists notification_preferences (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  email_enabled   boolean not null default true,
  -- Hour of day (0-23, local time) when quiet window starts; null means none.
  quiet_hours_start smallint,
  -- Hour of day (0-23, local time) when quiet window ends (exclusive); null means none.
  quiet_hours_end   smallint,
  timezone        text not null default 'Europe/Bucharest',
  updated_at      timestamptz not null default now(),
  constraint quiet_hours_start_range
    check (quiet_hours_start is null or (quiet_hours_start >= 0 and quiet_hours_start < 24)),
  constraint quiet_hours_end_range
    check (quiet_hours_end is null or (quiet_hours_end >= 0 and quiet_hours_end < 24))
);

alter table notification_preferences enable row level security;

-- Each resident reads and writes their own row only.
create policy "owner_rw" on notification_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table notification_preferences is
  'Per-resident email notification channel preferences (T14). '
  'Service-role reads in notify-email Netlify function for quiet-hours gate.';
