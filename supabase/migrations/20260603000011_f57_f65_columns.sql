-- T219: add missing columns to F57-F65 tables + member-insert policies

-- F57 marketplace_listings: add seller_name, category
alter table marketplace_listings
  add column if not exists seller_name text,
  add column if not exists category text;

create policy "members insert marketplace" on marketplace_listings for insert
  with check (is_member(asociatie_id) and seller_user_id = auth.uid());

-- F58 carpool_profiles: add user_name, created_at; unique per user per asociatie
alter table carpool_profiles
  add column if not exists user_name text,
  add column if not exists created_at timestamptz not null default now();

alter table carpool_profiles
  drop constraint if exists carpool_profiles_asociatie_user_unique;
alter table carpool_profiles
  add constraint carpool_profiles_asociatie_user_unique unique (asociatie_id, user_id);

-- F59 sitter_profiles: add user_name, created_at
alter table sitter_profiles
  add column if not exists user_name text,
  add column if not exists created_at timestamptz not null default now();

alter table sitter_profiles
  drop constraint if exists sitter_profiles_asociatie_user_unique;
alter table sitter_profiles
  add constraint sitter_profiles_asociatie_user_unique unique (asociatie_id, user_id);

-- F60 skill_offerings: add user_name
alter table skill_offerings
  add column if not exists user_name text;

alter table skill_offerings
  drop constraint if exists skill_offerings_asociatie_user_unique;
alter table skill_offerings
  add constraint skill_offerings_asociatie_user_unique unique (asociatie_id, user_id);

-- F61 group_buys: add organizer_name; member-insert policy
alter table group_buys
  add column if not exists organizer_name text;

create policy "members insert group_buys" on group_buys for insert
  with check (is_member(asociatie_id) and organizer_user_id = auth.uid());

create policy "members insert group_buy_signups" on group_buy_signups for insert
  with check (is_member(asociatie_id) and user_id = auth.uid());

alter table group_buy_signups
  drop constraint if exists group_buy_signups_buy_user_unique;
alter table group_buy_signups
  add constraint group_buy_signups_buy_user_unique unique (group_buy_id, user_id);

-- F62 welcome_kit_templates: add order_num, title, body (multi-step items)
alter table welcome_kit_templates
  add column if not exists order_num int not null default 0,
  add column if not exists title text,
  add column if not exists body text;

-- F63 birthdays_consent: add user_name; unique per user per asociatie
alter table birthdays_consent
  add column if not exists user_name text;

alter table birthdays_consent
  drop constraint if exists birthdays_consent_asociatie_user_unique;
alter table birthdays_consent
  add constraint birthdays_consent_asociatie_user_unique unique (asociatie_id, user_id);

-- F64 kids_age_ranges: add bucket, count_num; unique per user+bucket per asociatie
alter table kids_age_ranges
  add column if not exists bucket text,
  add column if not exists count_num int not null default 1;

alter table kids_age_ranges
  drop constraint if exists kids_age_ranges_user_bucket_unique;
alter table kids_age_ranges
  add constraint kids_age_ranges_user_bucket_unique unique (asociatie_id, user_id, bucket);

-- F64 kids_events: add missing columns
alter table kids_events
  add column if not exists date text,
  add column if not exists time text,
  add column if not exists location text,
  add column if not exists bucket text,
  add column if not exists note text,
  add column if not exists interested int not null default 0,
  add column if not exists organizer_user_id uuid references users(id),
  add column if not exists organizer_name text,
  add column if not exists created_at timestamptz not null default now();

create policy "members insert kids_events" on kids_events for insert
  with check (is_member(asociatie_id));

-- F65 platform_feedback: member-insert + anonymous-insert policy
create policy "members insert feedback" on platform_feedback for insert
  with check (
    (asociatie_id is null) or is_member(asociatie_id)
  );
