-- vecini.online -- telegram_link_codes: per-user link codes for the Telegram
-- binding flow (T50/T58). An already-registered resident mints a single-use
-- code; the webhook resolves and consumes it atomically via the service-role
-- client. The resident-facing UX surface is T68.
--
-- RLS: residents manage their own codes (read/create/delete), scoped by both
-- user_id and is_member(asociatie_id). The webhook runs under the service role
-- and bypasses RLS during /start CODE redemption.

create table telegram_link_codes (
  id text primary key,
  code text unique not null,
  user_id uuid not null references users(id) on delete cascade,
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  role text not null default 'proprietar',
  expires_at timestamptz,
  consumed_at timestamptz,
  consumed_by_telegram_id bigint,
  created_at timestamptz not null default now()
);

create index on telegram_link_codes (code);
create index on telegram_link_codes (user_id);

alter table telegram_link_codes enable row level security;

create policy "manage own telegram link codes" on telegram_link_codes
  for all
  using (user_id = auth.uid() and is_member(asociatie_id))
  with check (user_id = auth.uid() and is_member(asociatie_id));
