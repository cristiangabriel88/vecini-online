-- IntreVecini — personal-data breach log (T22, GDPR art. 33/34).
-- The asociație is the data controller. When a personal-data breach occurs it
-- must notify the supervisory authority (ANSPDCP) without undue delay and, where
-- feasible, within 72 hours of becoming aware (art. 33), unless the breach is
-- unlikely to result in a risk; where the risk is high it must also inform the
-- affected residents (art. 34). This table is the append-only accountability
-- record of those breaches and how they were handled — the documentation the
-- controller must be able to produce on request (art. 33(5)).
--
-- Privacy: a row never stores the breached data itself, only the breach
-- description and its approximate scope. `reported_by` is a display name (no
-- extra identifiers), mirroring the offline `breachLogic` model. The
-- append/no-delete policy set keeps the trail tamper-evident; admins may only
-- advance a record's status and stamp the notification times.

create table if not exists data_breaches (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  title text not null,
  description text not null,
  -- BreachNature[] from src/features/gdpr/breachLogic.ts: confidentiality / integrity / availability.
  nature text[] not null default '{}',
  -- When the controller became aware (starts the 72-hour clock) and, if known, when it occurred.
  discovered_at timestamptz not null,
  occurred_at timestamptz,
  -- i18n keys for the data categories involved; no actual personal data is stored here.
  data_categories text[] not null default '{}',
  affected_count integer not null default 0 check (affected_count >= 0),
  -- BreachRisk from breachLogic.ts.
  risk text not null check (risk in ('low', 'risk', 'high')),
  -- The RiskFactors object that drove the classification.
  factors jsonb not null default '{}'::jsonb,
  consequences text,
  measures text,
  -- BreachStatus from breachLogic.ts.
  status text not null default 'detectat'
    check (status in ('detectat', 'evaluat', 'notificat', 'inchis')),
  authority_notified_at timestamptz,
  subjects_notified_at timestamptz,
  -- Display name of whoever recorded it (never extra PII).
  reported_by text,
  created_at timestamptz not null default now()
);

create index if not exists data_breaches_asociatie_idx
  on data_breaches (asociatie_id, status, discovered_at desc);

alter table data_breaches enable row level security;

-- Only the data-controller roles (admin / president) of the association may
-- record, read and update the breach log; it carries the building's incident
-- handling, not resident-facing content. No delete policy exists for anyone, so
-- the accountability trail cannot be erased.
create policy "admin read breaches" on data_breaches for select
  using (has_role(asociatie_id, array['admin', 'presedinte']));

create policy "admin file breaches" on data_breaches for insert
  with check (has_role(asociatie_id, array['admin', 'presedinte']));

create policy "admin update breaches" on data_breaches for update
  using (has_role(asociatie_id, array['admin', 'presedinte']))
  with check (has_role(asociatie_id, array['admin', 'presedinte']));
