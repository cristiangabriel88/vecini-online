-- vecini.online -- email_outbox: logged outbound emails when MAIL_MODE=log (T175).
--
-- When the invite-email Netlify function runs with MAIL_MODE=log (Pi / local
-- dev), it writes here instead of calling Resend. Admins can inspect the
-- outbox from the Invitations page to verify that invite emails would be sent.
--
-- RLS: admins and presedinti of the asociatie can read their own rows.
-- Inserts are service-role-only (the Netlify function uses the service-role
-- client); no client insert policy is needed.

create table if not exists email_outbox (
  id           uuid        primary key default gen_random_uuid(),
  asociatie_id uuid        not null references asociatii(id) on delete cascade,
  to_email     text        not null,
  subject      text        not null,
  body         text        not null,
  created_at   timestamptz not null default now()
);

create index if not exists email_outbox_asociatie_idx on email_outbox (asociatie_id, created_at desc);

alter table email_outbox enable row level security;

-- Production safety: memberships.active may be absent from older schemas;
-- the policy below references it so ensure the column exists first.
alter table memberships
  add column if not exists active boolean generated always as (ended_at is null) stored;

-- Admins and presedinti can read outbox rows for their asociatie.
create policy "admin_read_email_outbox" on email_outbox
  for select
  using (
    exists (
      select 1 from memberships
      where memberships.asociatie_id = email_outbox.asociatie_id
        and memberships.user_id = auth.uid()
        and memberships.role in ('admin', 'presedinte')
        and memberships.active = true
    )
  );
