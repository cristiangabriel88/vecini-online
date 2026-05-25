-- vecini.online — F04 private messaging becomes a role-aware inbox.
--
-- Two corrections in one migration:
--
-- 1. Schema alignment. The app model (PrivateThread.subject / .resident_name /
--    .apartment_label and PrivateMessage.sender / .sender_name / .read) had
--    drifted from the original tables, which carried no subject and modelled a
--    message sender as a user id plus a read_at timestamp. Add the columns the
--    app actually reads and writes; the legacy columns are left in place for
--    compatibility. `read` means "read by the recipient": a resident message is
--    read by the administrator, an administrator message is read by the resident.
--
-- 2. Privacy. apply_standard_rls granted every member of the asociatie SELECT on
--    every row, so any resident could read any other resident's private thread
--    with the administrator. Replace those policies with party-or-admin ones: a
--    resident sees only the threads where they are the resident party; admins and
--    presedinti (the building's administrators) see every thread in their
--    asociatie. Messages inherit the rule through their parent thread.

-- ── 1. Schema alignment ──────────────────────────────────────────────────────
alter table private_threads add column if not exists subject text;
alter table private_threads add column if not exists resident_name text;
alter table private_threads add column if not exists apartment_label text;

alter table private_messages add column if not exists sender text;
alter table private_messages add column if not exists sender_name text;
alter table private_messages add column if not exists read boolean not null default false;

-- The app sender vocabulary; legacy rows (sender null) are left untouched.
alter table private_messages drop constraint if exists private_messages_sender_check;
alter table private_messages add constraint private_messages_sender_check
  check (sender is null or sender in ('resident', 'admin'));

-- ── 2. Party-or-admin RLS ────────────────────────────────────────────────────
-- Replace the permissive standard policies installed by apply_standard_rls. RLS
-- itself stays enabled; only the policies change. Idempotent: drop-if-exists then
-- recreate, so the migration can run repeatedly.
drop policy if exists "members read" on private_threads;
drop policy if exists "comitet write" on private_threads;
drop policy if exists "members read" on private_messages;
drop policy if exists "comitet write" on private_messages;

create policy "thread party read" on private_threads for select
  using (
    resident_user_id = auth.uid()
    or has_role(asociatie_id, array['admin', 'presedinte'])
  );

create policy "thread party write" on private_threads for all
  using (
    resident_user_id = auth.uid()
    or has_role(asociatie_id, array['admin', 'presedinte'])
  )
  with check (
    is_member(asociatie_id)
    and (
      resident_user_id = auth.uid()
      or has_role(asociatie_id, array['admin', 'presedinte'])
    )
  );

create policy "message party read" on private_messages for select
  using (
    exists (
      select 1 from private_threads t
      where t.id = private_messages.thread_id
        and (
          t.resident_user_id = auth.uid()
          or has_role(t.asociatie_id, array['admin', 'presedinte'])
        )
    )
  );

create policy "message party write" on private_messages for all
  using (
    exists (
      select 1 from private_threads t
      where t.id = private_messages.thread_id
        and (
          t.resident_user_id = auth.uid()
          or has_role(t.asociatie_id, array['admin', 'presedinte'])
        )
    )
  )
  with check (
    is_member(asociatie_id)
    and exists (
      select 1 from private_threads t
      where t.id = private_messages.thread_id
        and (
          t.resident_user_id = auth.uid()
          or has_role(t.asociatie_id, array['admin', 'presedinte'])
        )
    )
  );
