-- Photos bucket for resident-uploaded images (pets, bikes, lending items,
-- marketplace listings, visitor reports, etc.).
-- Object key convention: <asociatie_id>/<user_id>/<feature>/<filename>

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

-- Members read photos that belong to their asociatie (first path segment = asociatie_id).
create policy "members read asociatie photos"
  on storage.objects for select
  using (
    bucket_id = 'photos'
    and is_member((split_part(name, '/', 1))::uuid)
  );

-- Members upload to their own path within the asociatie
-- (second segment = user_id guards against writing under another resident's id).
create policy "members write own photos"
  on storage.objects for insert
  with check (
    bucket_id = 'photos'
    and is_member((split_part(name, '/', 1))::uuid)
    and (split_part(name, '/', 2))::uuid = auth.uid()
  );

-- Members delete their own photos.
create policy "members delete own photos"
  on storage.objects for delete
  using (
    bucket_id = 'photos'
    and is_member((split_part(name, '/', 1))::uuid)
    and (split_part(name, '/', 2))::uuid = auth.uid()
  );
