-- IntreVecini — storage buckets and RLS-mirroring policies.
-- Buckets are private; access is scoped to the user's asociație. The first path
-- segment of every object key is the asociatie_id, e.g. `<asociatie_id>/...`.

insert into storage.buckets (id, name, public)
values ('attachments','attachments', false),
       ('documents','documents', false),
       ('avatars','avatars', false)
on conflict (id) do nothing;

-- Read: a member of the asociație whose id prefixes the object path.
create policy "members read asociatie files"
  on storage.objects for select
  using (
    bucket_id in ('attachments','documents')
    and is_member((split_part(name, '/', 1))::uuid)
  );

-- Write: comitet/admin of that asociație.
create policy "comitet write asociatie files"
  on storage.objects for insert
  with check (
    bucket_id in ('attachments','documents')
    and has_role((split_part(name, '/', 1))::uuid, array['admin','presedinte','comitet'])
  );

-- Avatars: a user manages their own avatar at `<user_id>/...`.
create policy "users manage own avatar"
  on storage.objects for all
  using (bucket_id = 'avatars' and (split_part(name, '/', 1))::uuid = auth.uid())
  with check (bucket_id = 'avatars' and (split_part(name, '/', 1))::uuid = auth.uid());
