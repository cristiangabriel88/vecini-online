-- IntreVecini — data-subject requests (T06, GDPR art. 15/17/20).
-- The accountability trail for the two rights a resident exercises over their
-- personal data: access/portability (`export`) and erasure (`erasure`). Export
-- is self-service (the resident downloads their copy immediately in-app), but
-- the request is still logged here so the association — the data controller —
-- has a record of who asked for what and when; erasure requires an admin to
-- action it because it is irreversible and may need manual checks (e.g.
-- outstanding debts) before retained records are anonymized.
--
-- Privacy: a request row carries no exported personal data, only the request
-- metadata. `actioned_by` is the admin's display name (not extra identifiers),
-- mirroring the offline `gdprLogic` model. The append/no-delete policy set keeps
-- the trail tamper-evident; admins may only advance a pending request's status.

create table if not exists data_subject_requests (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  subject_user_id uuid not null references users(id) on delete cascade,
  -- Display name captured at request time so the queue stays readable even after
  -- the subject account is erased; never more than the name.
  subject_name text,
  -- One of the DsrType values from src/features/gdpr/gdprLogic.ts.
  type text not null check (type in ('export', 'erasure')),
  status text not null default 'pending' check (status in ('pending', 'completed', 'rejected')),
  requested_at timestamptz not null default now(),
  actioned_at timestamptz,
  -- Display name of the admin who actioned it (never extra PII).
  actioned_by text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists data_subject_requests_subject_idx
  on data_subject_requests (subject_user_id, requested_at desc);
create index if not exists data_subject_requests_asociatie_idx
  on data_subject_requests (asociatie_id, status, requested_at desc);

alter table data_subject_requests enable row level security;

-- A resident reads and files their own requests, scoped to an association they
-- belong to (so a request always carries a valid tenant). They cannot update or
-- delete a filed request — only an admin actions it, which keeps the trail honest.
create policy "self read own dsr" on data_subject_requests for select
  using (subject_user_id = auth.uid());

create policy "self file own dsr" on data_subject_requests for insert
  with check (subject_user_id = auth.uid() and is_member(asociatie_id));

-- Admin / president of the association review the queue and action requests
-- (advance status, record who actioned and when). No delete policy exists for
-- anyone, so the accountability trail cannot be erased.
create policy "admin read asociatie dsr" on data_subject_requests for select
  using (has_role(asociatie_id, array['admin', 'presedinte']));

create policy "admin action asociatie dsr" on data_subject_requests for update
  using (has_role(asociatie_id, array['admin', 'presedinte']))
  with check (has_role(asociatie_id, array['admin', 'presedinte']));
