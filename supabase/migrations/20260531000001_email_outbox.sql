-- vecini.online -- Email outbox for DEV/Pi logging mode (T175).
--
-- When MAIL_MODE=log the invite-email Netlify function writes here instead of
-- calling Resend. The admin invitations page reads this table (guarded by
-- !isProd()) so the Pi operator can confirm emails were "sent" without needing
-- a real Resend account.
--
-- RLS: admins and presidents of the matching asociatie can read rows for their
-- own asociatie. Insert is denied to all authenticated roles (the service-role
-- client used by the Netlify function bypasses RLS). No update or delete policy
-- so the log is append-only from the browser perspective.

create table if not exists email_outbox (
  id            uuid        primary key default gen_random_uuid(),
  asociatie_id  uuid        not null references asociatii(id) on delete cascade,
  to_email      text        not null,
  subject       text        not null,
  body          text        not null,
  created_at    timestamptz not null default now()
);

alter table email_outbox enable row level security;

create policy "admins read outbox" on email_outbox for select
  using (has_role(asociatie_id, array['admin','presedinte']));
