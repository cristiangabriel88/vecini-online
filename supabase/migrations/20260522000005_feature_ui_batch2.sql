-- IntreVecini — additive RLS for the features built out with UI in this batch
-- (F32, F45, F47, F58, F59, F60, F61, F63). The base tables and standard RLS
-- (members read · comitet write) already ship in 20260121000002_features.sql;
-- this migration layers an "owner may manage own row" policy on the opt-in /
-- resident-contributed tables so residents can create, edit and remove the rows
-- they own (profiles, offerings, group buys, courier codes) without comitet rights.
-- F47 energy_records and F45 multiyear_plan_items stay comitet-managed (standard
-- RLS only), matching their admin/comitet audience.

select apply_owner_rls('access_codes', 'generated_by');      -- F32 courier codes
select apply_owner_rls('sitter_profiles', 'user_id');        -- F59 babysitting / pet-sitting
select apply_owner_rls('skill_offerings', 'user_id');        -- F60 skill exchange
select apply_owner_rls('group_buys', 'organizer_user_id');   -- F61 group buys
select apply_owner_rls('group_buy_signups', 'user_id');      -- F61 signups
