-- vecini.online -- T96: platform error reports table
--
-- Stores scrubbed client error reports (already PII-free, see T07 errorReporting)
-- forwarded from the error-report Netlify function using the service-role key.
-- Readable only by platform super-admins via the is_super_admin() policy.
-- No INSERT/UPDATE/DELETE policies: only the service-role key may write rows.

create table if not exists platform_error_reports (
  id          uuid        primary key default gen_random_uuid(),
  ref         text        not null,
  name        text        not null,
  message     text        not null,
  source      text,
  extra       jsonb,
  at          bigint      not null,
  created_at  timestamptz not null default now()
);

alter table platform_error_reports enable row level security;

create policy "super_admin_read_platform_error_reports"
  on platform_error_reports
  for select
  to authenticated
  using (is_super_admin());
