-- T216: denormalized columns + member insert policies for F37/F38 + F36 profile columns

-- F37: denormalize owner name on pets for direct lookup without a join
alter table pets add column if not exists owner_name text;

-- F38: denormalize sender name on thank_yous for direct lookup without a join
alter table thank_yous add column if not exists from_name text;

-- F38: members may insert thank_yous (any member can post a public thank-you)
create policy "thank_yous_member_insert" on thank_yous
  for insert with check (is_member(asociatie_id));

-- F36: add denormalized profile columns to resident_directory_consent so
--      hydrateDirectory can read name/apartment/phone/email without joining
--      the users table (which has self-only RLS).
alter table resident_directory_consent
  add column if not exists name text,
  add column if not exists apartment text,
  add column if not exists phone text,
  add column if not exists email text;
