-- T214: member-level write policies for F22/F23/F24 + schema additions
-- required for the live activation of rfps/duty/lending stores.

-- F22: add selected column to rfp_quotes so hydrateRfps can track the winner
alter table rfp_quotes add column if not exists selected boolean not null default false;

-- F23: denormalize volunteer identity on duty_schedule for direct lookup
-- (the existing duty_volunteers join is preserved but unused in the live path)
alter table duty_schedule
  add column if not exists volunteer_user_id uuid references users(id),
  add column if not exists volunteer_name text;

-- F23: members may update duty_schedule to sign up for / release a slot
create policy "duty_schedule_member_update" on duty_schedule
  for update using (is_member(asociatie_id)) with check (is_member(asociatie_id));

-- F24: denormalize item owner name so hydration does not need a join
alter table lending_items add column if not exists owner_name text;

-- F24: members may update lending_items to toggle available/borrowed
create policy "lending_items_member_update" on lending_items
  for update using (is_member(asociatie_id)) with check (is_member(asociatie_id));

-- F22: members may insert rfp_quotes (add contractor quotes for open RFPs)
create policy "rfp_quotes_member_insert" on rfp_quotes
  for insert with check (is_member(asociatie_id));
