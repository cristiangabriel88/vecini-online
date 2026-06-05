-- vecini.online -- platform_broadcasts table (T253).
--
-- Platform operators can publish maintenance notices and broadcast messages
-- that render as a dismissible banner in the resident/admin app.
--
-- Writes go through platform-broadcast.ts (service-role Netlify function
-- that re-checks is_super_admin()). Authenticated residents can read active rows.
--
-- Idempotent: uses IF NOT EXISTS guards throughout.

create table if not exists platform_broadcasts (
  id           uuid         primary key default gen_random_uuid(),
  title        text         not null,
  body         text         not null,
  severity     text         not null default 'info'
                            check (severity in ('info', 'warning', 'critical')),
  target       text         not null default 'all'
                            check (target in ('all', 'admin')),
  starts_at    timestamptz  not null default now(),
  ends_at      timestamptz,
  created_by   uuid         references auth.users (id) on delete set null,
  created_at   timestamptz  not null default now(),
  expired_at   timestamptz
);

alter table platform_broadcasts enable row level security;

-- Platform admins can read all broadcasts (including expired ones) for the console.
-- Writes (publish / expire) are performed exclusively by the platform-broadcast
-- Netlify function via the service-role client, which bypasses RLS.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'platform_broadcasts' and policyname = 'super_admin_read'
  ) then
    create policy "super_admin_read" on platform_broadcasts
      for select using ( is_super_admin() );
  end if;
end $$;

-- Authenticated members can read active (non-expired, within window) broadcasts.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'platform_broadcasts' and policyname = 'members_read_active'
  ) then
    create policy "members_read_active" on platform_broadcasts
      for select
      to authenticated
      using (
        expired_at is null
        and starts_at <= now()
        and (ends_at is null or ends_at > now())
      );
  end if;
end $$;
