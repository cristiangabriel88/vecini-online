-- IntreVecini — per-feature tables (F01–F65)
-- Standard RLS: members of the asociație may read; admin/presedinte/comitet may
-- write. Owner-scoped tables get an extra owner policy below.

create or replace function apply_standard_rls(tbl regclass)
returns void language plpgsql as $$
begin
  execute format('alter table %s enable row level security', tbl);
  execute format($p$create policy "members read" on %s for select using (is_member(asociatie_id))$p$, tbl);
  execute format($p$create policy "comitet write" on %s for all
    using (has_role(asociatie_id, array['admin','presedinte','comitet']))
    with check (has_role(asociatie_id, array['admin','presedinte','comitet']))$p$, tbl);
end $$;

-- Helper to add an "owner may manage own row" policy (by created_by/owner col).
create or replace function apply_owner_rls(tbl regclass, owner_col text)
returns void language plpgsql as $$
begin
  execute format($p$create policy "owner manage" on %s for all
    using (%I = auth.uid()) with check (%I = auth.uid())$p$, tbl, owner_col, owner_col);
end $$;

-- ── F01 Anunțuri ─────────────────────────────────────────────────────────
create table announcements (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  author_user_id uuid references users(id),
  title text not null,
  body_html text not null,
  category text not null check (category in ('urgent','important','informativ','eveniment')),
  audience jsonb not null default '{"type":"all"}',
  search tsvector generated always as (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(body_html,''))) stored,
  scheduled_at timestamptz, published_at timestamptz, expires_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on announcements (asociatie_id, created_at desc);
create index on announcements using gin (search);
create table announcement_reads (
  announcement_id uuid not null references announcements(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);
create table attachments (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  related_type text, related_id uuid,
  filename text, mime_type text, size_bytes bigint, storage_path text,
  uploaded_by uuid references users(id), created_at timestamptz not null default now()
);
select apply_standard_rls('announcements');
select apply_standard_rls('attachments');
alter table announcement_reads enable row level security;
create policy "self read receipts" on announcement_reads for select using (user_id = auth.uid());
create policy "self mark read" on announcement_reads for insert with check (user_id = auth.uid());

-- ── F02 Discuții ───────────────────────────────────────────────────────────
create table discussion_threads (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  topic text, created_by uuid references users(id), pinned boolean not null default false,
  created_at timestamptz not null default now()
);
create table discussion_messages (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  thread_id uuid references discussion_threads(id) on delete cascade,
  author_user_id uuid references users(id), body text, deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create table moderation_actions (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  actor_user_id uuid references users(id), target_user_id uuid references users(id),
  action text, reason text, until timestamptz, created_at timestamptz not null default now()
);
select apply_standard_rls('discussion_threads');
select apply_standard_rls('discussion_messages');
select apply_standard_rls('moderation_actions');
select apply_owner_rls('discussion_messages','author_user_id');

-- ── F03 Alerte ─────────────────────────────────────────────────────────────
create table alerts (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  sender_user_id uuid references users(id), title text not null, body text not null,
  kind text, recipient_count int not null default 0, sent_at timestamptz not null default now()
);
create table alert_acknowledgments (
  alert_id uuid not null references alerts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  primary key (alert_id, user_id)
);
select apply_standard_rls('alerts');
alter table alert_acknowledgments enable row level security;
create policy "self ack" on alert_acknowledgments for insert with check (user_id = auth.uid());
create policy "self read ack" on alert_acknowledgments for select using (user_id = auth.uid());

-- ── F04 Mesaje admin / F05 Anonim ─────────────────────────────────────────
create table private_threads (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  resident_user_id uuid references users(id), status text not null default 'open',
  created_at timestamptz not null default now()
);
create table private_messages (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  thread_id uuid references private_threads(id) on delete cascade,
  sender_user_id uuid references users(id), body text, read_at timestamptz,
  created_at timestamptz not null default now()
);
create table anonymous_messages (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  sender_user_id uuid references users(id), -- hidden from comitet at the app layer
  body text not null, status text not null default 'nou', created_at timestamptz not null default now()
);
select apply_standard_rls('private_threads');
select apply_standard_rls('private_messages');
select apply_standard_rls('anonymous_messages');

-- ── F06 Locator / F07 FAQ ─────────────────────────────────────────────────
create table resident_posts (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  author_user_id uuid references users(id), category text, title text, body text,
  photo_path text, expires_at timestamptz, created_at timestamptz not null default now()
);
create table faq_entries (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  category text, question text not null, answer text not null, sort_order int default 0
);
create table faq_votes (
  faq_id uuid not null references faq_entries(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  helpful boolean, primary key (faq_id, user_id)
);
select apply_standard_rls('resident_posts');
select apply_standard_rls('faq_entries');
select apply_owner_rls('resident_posts','author_user_id');
alter table faq_votes enable row level security;
create policy "self faq vote" on faq_votes for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── F08 Evenimente ─────────────────────────────────────────────────────────
create table events (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  title text not null, description text, location text, category text,
  starts_at timestamptz not null, ends_at timestamptz,
  created_by uuid references users(id), created_at timestamptz not null default now()
);
create table event_rsvps (
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status text not null default 'yes', primary key (event_id, user_id)
);
create index on events (asociatie_id, starts_at);
select apply_standard_rls('events');
alter table event_rsvps enable row level security;
create policy "self rsvp" on event_rsvps for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── F09 Voturi ─────────────────────────────────────────────────────────────
create table polls (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  author_user_id uuid references users(id), title text not null, description text,
  poll_type text not null check (poll_type in ('yes_no','single_choice','multi_choice','ranked')),
  weighted boolean not null default false, quorum_percent int not null default 0,
  majority_rule text not null default 'simple',
  opens_at timestamptz, closes_at timestamptz, audience jsonb not null default '{"type":"all"}',
  created_at timestamptz not null default now(), published_at timestamptz, closed_at timestamptz
);
create table poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  label text not null, sort_order int not null default 0
);
create table votes (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  poll_id uuid not null references polls(id) on delete cascade,
  apartment_id uuid not null references apartments(id),
  voter_user_id uuid references users(id),
  selected_option_ids uuid[], ranked_options jsonb, weight numeric not null default 1,
  cast_at timestamptz not null default now(),
  unique (poll_id, apartment_id)
);
select apply_standard_rls('polls');
select apply_standard_rls('votes');
alter table poll_options enable row level security;
create policy "members read options" on poll_options for select using (
  exists (select 1 from polls p where p.id = poll_id and is_member(p.asociatie_id)));
create policy "comitet write options" on poll_options for all using (
  exists (select 1 from polls p where p.id = poll_id and has_role(p.asociatie_id, array['admin','presedinte','comitet']))
) with check (
  exists (select 1 from polls p where p.id = poll_id and has_role(p.asociatie_id, array['admin','presedinte','comitet'])));
create policy "self cast vote" on votes for insert with check (voter_user_id = auth.uid() and is_member(asociatie_id));

-- ── F10 AGA / F11 Procese verbale ─────────────────────────────────────────
create table agas (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  title text not null, scheduled_at timestamptz, location text, scheduled_online boolean default false,
  convocator_pdf_path text, required_quorum_percent int,
  status text not null default 'draft' check (status in ('draft','convocata','in_desfasurare','incheiata','anulata')),
  procesverbal_pdf_path text, created_at timestamptz not null default now()
);
create table aga_agenda_items (
  id uuid primary key default gen_random_uuid(), aga_id uuid not null references agas(id) on delete cascade,
  sort_order int default 0, title text, description text, decision_type text
);
create table aga_attendees (
  id uuid primary key default gen_random_uuid(), aga_id uuid not null references agas(id) on delete cascade,
  apartment_id uuid references apartments(id), user_id uuid references users(id),
  arrived_at timestamptz, left_at timestamptz, present boolean default false,
  is_proxy boolean default false, proxy_for_apartment_id uuid references apartments(id), proxy_document_path text
);
create table aga_votes (
  id uuid primary key default gen_random_uuid(), aga_id uuid not null references agas(id) on delete cascade,
  agenda_item_id uuid references aga_agenda_items(id) on delete cascade, apartment_id uuid references apartments(id),
  decision text check (decision in ('pentru','contra','abtinere')), weight numeric default 1, cast_at timestamptz not null default now()
);
create table pv_documents (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  title text, doc_date date, storage_path text,
  content_text text, search tsvector generated always as (to_tsvector('simple', coalesce(content_text,''))) stored,
  created_at timestamptz not null default now()
);
create index on pv_documents using gin (search);
select apply_standard_rls('agas');
select apply_standard_rls('pv_documents');
do $$ begin
  perform 1;
end $$;
alter table aga_agenda_items enable row level security;
create policy "members read agenda" on aga_agenda_items for select using (
  exists (select 1 from agas a where a.id = aga_id and is_member(a.asociatie_id)));
create policy "comitet write agenda" on aga_agenda_items for all using (
  exists (select 1 from agas a where a.id = aga_id and has_role(a.asociatie_id, array['admin','presedinte','comitet']))
) with check (
  exists (select 1 from agas a where a.id = aga_id and has_role(a.asociatie_id, array['admin','presedinte','comitet'])));
alter table aga_attendees enable row level security;
create policy "members read attendees" on aga_attendees for select using (
  exists (select 1 from agas a where a.id = aga_id and is_member(a.asociatie_id)));
create policy "comitet write attendees" on aga_attendees for all using (
  exists (select 1 from agas a where a.id = aga_id and has_role(a.asociatie_id, array['admin','presedinte','comitet']))
) with check (
  exists (select 1 from agas a where a.id = aga_id and has_role(a.asociatie_id, array['admin','presedinte','comitet'])));
-- aga_votes is scoped through its parent aga (it carries no asociatie_id), so it
-- gets parent-resolved policies like the other AGA child tables instead of
-- apply_standard_rls (which would reference a non-existent asociatie_id column
-- and abort the migration). Members read the tally; comitet manages; a member
-- casts their own vote via the "self cast aga vote" insert policy in batch 5.
alter table aga_votes enable row level security;
create policy "members read votes" on aga_votes for select using (
  exists (select 1 from agas a where a.id = aga_id and is_member(a.asociatie_id)));
create policy "comitet write votes" on aga_votes for all using (
  exists (select 1 from agas a where a.id = aga_id and has_role(a.asociatie_id, array['admin','presedinte','comitet']))
) with check (
  exists (select 1 from agas a where a.id = aga_id and has_role(a.asociatie_id, array['admin','presedinte','comitet'])));

-- ── F12 Buget participativ / F13 Priorități / F14 Idei ─────────────────────
create table budget_cycles (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  title text, pool_amount numeric, phase text, submit_deadline timestamptz, vote_deadline timestamptz,
  created_at timestamptz not null default now()
);
create table budget_proposals (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  cycle_id uuid references budget_cycles(id) on delete cascade, author_user_id uuid references users(id),
  title text, description text, cost_estimate numeric, created_at timestamptz not null default now()
);
create table budget_votes (
  proposal_id uuid not null references budget_proposals(id) on delete cascade,
  apartment_id uuid not null references apartments(id), cast_at timestamptz not null default now(),
  primary key (proposal_id, apartment_id)
);
create table project_priorities (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  title text, description text, deadline timestamptz, created_at timestamptz not null default now()
);
create table priority_rankings (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  apartment_id uuid references apartments(id), ranking jsonb, created_at timestamptz not null default now()
);
create table ideas (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  author_user_id uuid references users(id), title text, body text,
  status text not null default 'in_discutie', created_at timestamptz not null default now()
);
create table idea_votes (
  idea_id uuid not null references ideas(id) on delete cascade,
  apartment_id uuid not null references apartments(id), primary key (idea_id, apartment_id)
);
create table idea_comments (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  idea_id uuid references ideas(id) on delete cascade, author_user_id uuid references users(id),
  body text, created_at timestamptz not null default now()
);
select apply_standard_rls('budget_cycles');
select apply_standard_rls('budget_proposals');
select apply_standard_rls('project_priorities');
select apply_standard_rls('priority_rankings');
select apply_standard_rls('ideas');
select apply_standard_rls('idea_comments');
select apply_owner_rls('budget_proposals','author_user_id');
select apply_owner_rls('ideas','author_user_id');

-- ── F15 Sondaje / F16 Petiții ──────────────────────────────────────────────
create table surveys (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  title text, options jsonb, anonymous boolean not null default true, closes_at timestamptz,
  created_at timestamptz not null default now()
);
create table survey_responses (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  survey_id uuid references surveys(id) on delete cascade, user_id uuid references users(id),
  choice text, created_at timestamptz not null default now()
);
create table petitions (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  author_user_id uuid references users(id), title text, body text, threshold_percent int default 25,
  response text, status text not null default 'deschisa', created_at timestamptz not null default now()
);
create table petition_signatures (
  petition_id uuid not null references petitions(id) on delete cascade,
  apartment_id uuid not null references apartments(id), signed_at timestamptz not null default now(),
  primary key (petition_id, apartment_id)
);
select apply_standard_rls('surveys');
select apply_standard_rls('survey_responses');
select apply_standard_rls('petitions');
select apply_owner_rls('petitions','author_user_id');

-- ── F17 Sesizări ───────────────────────────────────────────────────────────
create table tickets (
  id uuid primary key default gen_random_uuid(),
  asociatie_id uuid not null references asociatii(id) on delete cascade,
  reporter_user_id uuid references users(id), apartment_id uuid references apartments(id),
  title text not null, description text, category text,
  severity text not null check (severity in ('low','medium','high','critical')),
  location_scara text, location_etaj int, location_description text,
  status text not null default 'primit' check (status in ('primit','asignat','in_lucru','rezolvat','verificat','inchis','respins')),
  assigned_to_user_id uuid references users(id), sla_due_at timestamptz,
  resolved_at timestamptz, verified_at timestamptz, resolution_notes text,
  rating int check (rating between 1 and 5),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on tickets (asociatie_id, created_at desc);
create table ticket_attachments (
  id uuid primary key default gen_random_uuid(), ticket_id uuid not null references tickets(id) on delete cascade,
  storage_path text, mime_type text, created_at timestamptz not null default now()
);
create table ticket_status_history (
  id uuid primary key default gen_random_uuid(), ticket_id uuid not null references tickets(id) on delete cascade,
  from_status text, to_status text, changed_by uuid references users(id), notes text,
  changed_at timestamptz not null default now()
);
select apply_standard_rls('tickets');
create policy "residents create tickets" on tickets for insert with check (reporter_user_id = auth.uid() and is_member(asociatie_id));
alter table ticket_attachments enable row level security;
create policy "members read ticket attach" on ticket_attachments for select using (
  exists (select 1 from tickets t where t.id = ticket_id and is_member(t.asociatie_id)));
alter table ticket_status_history enable row level security;
create policy "members read ticket history" on ticket_status_history for select using (
  exists (select 1 from tickets t where t.id = ticket_id and is_member(t.asociatie_id)));

-- ── F18-F24 Maintenance ────────────────────────────────────────────────────
create table repair_records (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  system text, title text, description text, contractor text, cost numeric,
  warranty_until date, photo_paths text[], performed_at date, created_at timestamptz not null default now()
);
create table scheduled_maintenance (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  title text, vendor text, recurrence text, last_done date, next_due date, notes text
);
create table maintenance_log (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  maintenance_id uuid references scheduled_maintenance(id) on delete cascade, done_at date, notes text
);
create table meters (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  apartment_id uuid references apartments(id), kind text, serial text
);
create table meter_readings (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  meter_id uuid references meters(id) on delete cascade, value numeric, photo_path text,
  submitted_by uuid references users(id), reading_date date, created_at timestamptz not null default now()
);
create table rfps (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  title text, description text, status text not null default 'deschis', created_at timestamptz not null default now()
);
create table rfp_quotes (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  rfp_id uuid references rfps(id) on delete cascade, contractor text, amount numeric, document_path text
);
create table contractor_recommendations (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  rfp_id uuid references rfps(id) on delete cascade, recommended_by uuid references users(id), contractor text, note text
);
create table duty_volunteers (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  user_id uuid references users(id), active boolean not null default true
);
create table duty_schedule (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  volunteer_id uuid references duty_volunteers(id), week_start date, note text
);
create table lending_items (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  owner_user_id uuid references users(id), name text, category text, photo_path text,
  available boolean not null default true, created_at timestamptz not null default now()
);
create table lending_records (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  item_id uuid references lending_items(id) on delete cascade, borrower_user_id uuid references users(id),
  borrowed_at timestamptz, returned_at timestamptz
);
select apply_standard_rls('repair_records');
select apply_standard_rls('scheduled_maintenance');
select apply_standard_rls('maintenance_log');
select apply_standard_rls('meters');
select apply_standard_rls('meter_readings');
select apply_standard_rls('rfps');
select apply_standard_rls('rfp_quotes');
select apply_standard_rls('contractor_recommendations');
select apply_standard_rls('duty_volunteers');
select apply_standard_rls('duty_schedule');
select apply_standard_rls('lending_items');
select apply_standard_rls('lending_records');
select apply_owner_rls('lending_items','owner_user_id');

-- ── F25-F32 Shared spaces ──────────────────────────────────────────────────
create table bookable_resources (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  resource_type text, name text, description text, capacity int, rules jsonb not null default '{}',
  is_active boolean not null default true
);
create table bookings (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  resource_id uuid references bookable_resources(id) on delete cascade, apartment_id uuid references apartments(id),
  booked_by_user_id uuid references users(id), starts_at timestamptz, ends_at timestamptz, purpose text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled','completed','no_show')),
  approved_by uuid references users(id), approved_at timestamptz, created_at timestamptz not null default now()
);
create table booking_inspections (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  booking_id uuid references bookings(id) on delete cascade, notes text, ok boolean, created_at timestamptz not null default now()
);
create table parking_spots (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  label text, zone text, is_visitor boolean not null default false
);
create table parking_assignments (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  spot_id uuid references parking_spots(id) on delete cascade, apartment_id uuid references apartments(id),
  license_plate text
);
create table parking_reports (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  spot_id uuid references parking_spots(id), reporter_user_id uuid references users(id), note text,
  created_at timestamptz not null default now()
);
create table bikes (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  owner_user_id uuid references users(id), description text, serial text, photo_path text,
  abandoned boolean not null default false
);
create table storage_units (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  label text, apartment_id uuid references apartments(id), notes text
);
create table green_space_tasks (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  title text, week_start date
);
create table task_signups (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  task_id uuid references green_space_tasks(id) on delete cascade, user_id uuid references users(id)
);
create table access_codes (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  generated_by uuid references users(id), code text, expires_at timestamptz, used_at timestamptz,
  created_at timestamptz not null default now()
);
select apply_standard_rls('bookable_resources');
select apply_standard_rls('bookings');
select apply_standard_rls('booking_inspections');
select apply_standard_rls('parking_spots');
select apply_standard_rls('parking_assignments');
select apply_standard_rls('parking_reports');
select apply_standard_rls('bikes');
select apply_standard_rls('storage_units');
select apply_standard_rls('green_space_tasks');
select apply_standard_rls('task_signups');
select apply_standard_rls('access_codes');
select apply_owner_rls('bookings','booked_by_user_id');
select apply_owner_rls('bikes','owner_user_id');

-- ── F33-F40 Information & records ──────────────────────────────────────────
create table documents (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  category text, title text, storage_path text, version int default 1,
  content_text text, search tsvector generated always as (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content_text,''))) stored,
  created_at timestamptz not null default now()
);
create index on documents using gin (search);
create table suppliers (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  name text, kind text, contact text, account_number text,
  contract_start date, contract_end date, last_invoice_date date
);
create table supplier_complaints (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  supplier_id uuid references suppliers(id) on delete cascade, body text, created_at timestamptz not null default now()
);
create table resident_directory_consent (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  user_id uuid references users(id), show_name boolean default false, show_apartment boolean default false,
  show_phone boolean default false, show_email boolean default false
);
create table pets (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  owner_user_id uuid references users(id), name text, species text, photo_path text, emergency_contact text
);
create table thank_yous (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  from_user_id uuid references users(id), to_apartment text, message text, created_at timestamptz not null default now()
);
create table wiki_pages (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  slug text, title text, body_md text, search tsvector generated always as (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(body_md,''))) stored,
  updated_at timestamptz not null default now()
);
create index on wiki_pages using gin (search);
create table wiki_revisions (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  page_id uuid references wiki_pages(id) on delete cascade, body_md text, editor_user_id uuid references users(id),
  created_at timestamptz not null default now()
);
create table wiki_suggested_edits (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  page_id uuid references wiki_pages(id) on delete cascade, suggested_by uuid references users(id),
  body_md text, status text not null default 'in_asteptare', created_at timestamptz not null default now()
);
create table glossary_entries (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  term text, definition text
);
select apply_standard_rls('documents');
select apply_standard_rls('suppliers');
select apply_standard_rls('supplier_complaints');
select apply_standard_rls('resident_directory_consent');
select apply_standard_rls('pets');
select apply_standard_rls('thank_yous');
select apply_standard_rls('wiki_pages');
select apply_standard_rls('wiki_revisions');
select apply_standard_rls('wiki_suggested_edits');
select apply_standard_rls('glossary_entries');
select apply_owner_rls('resident_directory_consent','user_id');
select apply_owner_rls('pets','owner_user_id');

-- ── F41-F48 Projects ───────────────────────────────────────────────────────
create table projects (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  title text, description text, contractor text, budget_allocated numeric, budget_spent numeric,
  status text, created_at timestamptz not null default now()
);
create table project_phases (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade, title text, percent_complete int default 0, sort_order int default 0
);
create table project_updates (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade, phase_id uuid references project_phases(id),
  author_user_id uuid references users(id), body text, created_at timestamptz not null default now()
);
create table project_photos (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade, phase_id uuid references project_phases(id),
  storage_path text, caption text, taken_at date, created_at timestamptz not null default now()
);
create table contractors (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  name text, specialty text, price_tier text, contact text, last_used date, available boolean default true
);
create table contractor_ratings (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  contractor_id uuid references contractors(id) on delete cascade, rater_user_id uuid references users(id),
  rating int check (rating between 0 and 5), note text
);
create table crowdfunds (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  title text, description text, target_amount numeric, deadline date, created_at timestamptz not null default now()
);
create table pledges (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  crowdfund_id uuid references crowdfunds(id) on delete cascade, user_id uuid references users(id), amount numeric,
  created_at timestamptz not null default now()
);
create table multiyear_plan_items (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  year int, title text, estimated_cost numeric, notes text
);
create table energy_records (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  period date, kind text, amount numeric, cost numeric
);
create table warranties (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  asset text, purchased_at date, warranty_months int, expires_at date, document_path text
);
select apply_standard_rls('projects');
select apply_standard_rls('project_phases');
select apply_standard_rls('project_updates');
select apply_standard_rls('project_photos');
select apply_standard_rls('contractors');
select apply_standard_rls('contractor_ratings');
select apply_standard_rls('crowdfunds');
select apply_standard_rls('pledges');
select apply_standard_rls('multiyear_plan_items');
select apply_standard_rls('energy_records');
select apply_standard_rls('warranties');

-- ── F49-F56 Safety & compliance ────────────────────────────────────────────
create table safety_codes (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  owner_user_id uuid references users(id), encrypted_payload text, created_at timestamptz not null default now()
);
create table evacuation_plans (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  scara text, etaj int, image_path text
);
create table pet_markers (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  apartment_id uuid references apartments(id), species text
);
create table psi_assets (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  asset text, kind text, location text, next_check date
);
create table psi_checks (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  asset_id uuid references psi_assets(id) on delete cascade, checked_at date, vendor text, ok boolean
);
create table insurance_policies (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  insurer text, policy_number text, expires_at date, document_path text
);
create table insurance_claims (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  policy_id uuid references insurance_policies(id) on delete cascade, description text, amount numeric, status text,
  created_at timestamptz not null default now()
);
create table keys (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  space text, holder_user_id uuid references users(id), notes text
);
create table key_handovers (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  key_id uuid references keys(id) on delete cascade, from_user_id uuid references users(id), to_user_id uuid references users(id),
  handed_at timestamptz not null default now()
);
create table visitor_reports (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  reporter_user_id uuid references users(id), note text, photo_path text, status text not null default 'nou',
  created_at timestamptz not null default now()
);
create table alarm_systems (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  name text, status text, last_test date
);
create table alarm_events (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  system_id uuid references alarm_systems(id) on delete cascade, kind text, occurred_at timestamptz not null default now()
);
create table emergency_contacts (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  label text not null, phone text not null, category text, sort_order int not null default 0
);
select apply_standard_rls('evacuation_plans');
select apply_standard_rls('pet_markers');
select apply_standard_rls('psi_assets');
select apply_standard_rls('psi_checks');
select apply_standard_rls('insurance_policies');
select apply_standard_rls('insurance_claims');
select apply_standard_rls('keys');
select apply_standard_rls('key_handovers');
select apply_standard_rls('visitor_reports');
select apply_standard_rls('alarm_systems');
select apply_standard_rls('alarm_events');
select apply_standard_rls('emergency_contacts');
-- safety_codes: strictly owner-only (encrypted, never visible to comitet)
alter table safety_codes enable row level security;
create policy "owner only safety codes" on safety_codes for all
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

-- ── F57-F65 Community ──────────────────────────────────────────────────────
create table marketplace_listings (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  seller_user_id uuid references users(id), title text, description text, price numeric, photo_path text,
  expires_at timestamptz, created_at timestamptz not null default now()
);
create table carpool_profiles (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  user_id uuid references users(id), destination text, schedule text
);
create table sitter_profiles (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  user_id uuid references users(id), kind text, availability text, rate text
);
create table sitter_ratings (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  sitter_id uuid references sitter_profiles(id) on delete cascade, rater_user_id uuid references users(id),
  rating int check (rating between 0 and 5), note text
);
create table skill_offerings (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  user_id uuid references users(id), offers text, needs text
);
create table skill_exchanges (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  offering_id uuid references skill_offerings(id) on delete cascade, partner_user_id uuid references users(id),
  note text, created_at timestamptz not null default now()
);
create table group_buys (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  organizer_user_id uuid references users(id), title text, description text, deadline timestamptz,
  created_at timestamptz not null default now()
);
create table group_buy_signups (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  group_buy_id uuid references group_buys(id) on delete cascade, user_id uuid references users(id), quantity numeric
);
create table welcome_kit_templates (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  body_md text, updated_at timestamptz not null default now()
);
create table birthdays_consent (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  user_id uuid references users(id), birth_day int, birth_month int
);
create table kids_age_ranges (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  user_id uuid references users(id), age_min int, age_max int
);
create table kids_events (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid not null references asociatii(id) on delete cascade,
  title text, starts_at timestamptz, created_by uuid references users(id)
);
create table platform_feedback (
  id uuid primary key default gen_random_uuid(), asociatie_id uuid,
  user_id uuid references users(id), anonymous boolean default false, body text, sentiment text,
  created_at timestamptz not null default now()
);
select apply_standard_rls('marketplace_listings');
select apply_standard_rls('carpool_profiles');
select apply_standard_rls('sitter_profiles');
select apply_standard_rls('sitter_ratings');
select apply_standard_rls('skill_offerings');
select apply_standard_rls('skill_exchanges');
select apply_standard_rls('group_buys');
select apply_standard_rls('group_buy_signups');
select apply_standard_rls('welcome_kit_templates');
select apply_standard_rls('birthdays_consent');
select apply_standard_rls('kids_age_ranges');
select apply_standard_rls('kids_events');
select apply_owner_rls('marketplace_listings','seller_user_id');
select apply_owner_rls('carpool_profiles','user_id');
select apply_owner_rls('birthdays_consent','user_id');
select apply_owner_rls('kids_age_ranges','user_id');
-- platform_feedback: any member can insert; only platform reads (service role)
alter table platform_feedback enable row level security;
create policy "insert feedback" on platform_feedback for insert with check (auth.uid() is not null);
