-- T206: extend ticket_attachments with file metadata columns and add reporter insert policy

alter table ticket_attachments
  add column if not exists file_name text,
  add column if not exists file_size bigint default 0;

create policy "reporters insert ticket attach" on ticket_attachments for insert with check (
  exists (
    select 1 from tickets t
    where t.id = ticket_id
    and t.reporter_user_id = auth.uid()
    and is_member(t.asociatie_id)
  )
);
