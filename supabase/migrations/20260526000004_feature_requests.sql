-- vecini.online - resident feature-activation requests (T150).
-- A module disabled for the asociație is hidden from the nav and gated at the
-- route; only the admin controls the feature flags (live activation, T56). This
-- table is the lightweight channel for a resident to ask the admin to enable a
-- module they reached. It carries no personal data beyond the requester's display
-- name (captured so the admin queue stays readable even after the account is
-- erased) and the registry feature key, scoped to the asociație for RLS.

create table if not exists feature_requests (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  -- Registry feature key from src/shared/features/registry.ts (e.g. 'F12').
  feature_key text not null,
  requested_by uuid not null references users(id) on delete cascade,
  -- Display name captured at request time; never more than the name.
  requester_name text,
  created_at timestamptz not null default now(),
  -- One open request per resident per module: the resident's button shows the
  -- "already requested" state and cannot pile duplicates onto the admin queue.
  unique (asociatie_id, feature_key, requested_by)
);

create index if not exists feature_requests_asociatie_idx
  on feature_requests (asociatie_id, feature_key, created_at desc);

alter table feature_requests enable row level security;

-- A resident reads and files their own requests, scoped to an association they
-- belong to (so a request always carries a valid tenant). They cannot update a
-- filed request; withdrawing it is a delete of their own row.
create policy "self read own feature request" on feature_requests for select
  using (requested_by = auth.uid());

create policy "self file own feature request" on feature_requests for insert
  with check (requested_by = auth.uid() and is_member(asociatie_id));

create policy "self withdraw own feature request" on feature_requests for delete
  using (requested_by = auth.uid());

-- Admin / president of the association review the demand and may clear a request
-- once they have actioned it (e.g. enabled the module). They never edit content.
create policy "admin read asociatie feature requests" on feature_requests for select
  using (has_role(asociatie_id, array['admin', 'presedinte']));

create policy "admin clear asociatie feature requests" on feature_requests for delete
  using (has_role(asociatie_id, array['admin', 'presedinte']));
