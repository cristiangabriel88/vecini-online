-- IntreVecini — require active membership in the row's asociatie on every
-- owner-scoped policy (T45, a write-path tightening of the T04 sweep).
--
-- The "owner manage" policy created by apply_owner_rls gated only on
--   owner_col = auth.uid()
-- and never also required the row's asociatie_id to belong to an asociație the
-- actor is an active member of. The standard "members read" / "comitet write"
-- policies are asociatie-scoped, but the additive owner policy is a "for all"
-- grant, so on a table that carries it a user could in principle insert (or
-- keep owning) a row stamped with ANOTHER asociație's id as long as the owner
-- column held their own uid. That widens what the owner policy alone permits
-- beyond the tenant the user belongs to.
--
-- Fix: redefine apply_owner_rls so the policy also requires
--   is_member(asociatie_id)
-- in both USING and WITH CHECK, and re-apply the tightened policy to every
-- owner-scoped table already in the schema. Every such table carries a direct
-- asociatie_id column (each also gets apply_standard_rls, except pledges which
-- declares asociatie_id explicitly), so the reference always resolves.
--
-- This is the owner-policy companion to apply_member_insert_rls, whose
-- "member insert own" policy already requires is_member(asociatie_id); no
-- change is needed there. Additive and idempotent: each policy is dropped if
-- present and recreated, so the migration can run repeatedly.

-- Tightened generator: future apply_owner_rls calls inherit the membership
-- requirement.
create or replace function apply_owner_rls(tbl regclass, owner_col text)
returns void language plpgsql as $$
begin
  execute format($p$create policy "owner manage" on %s for all
    using (%I = auth.uid() and is_member(asociatie_id))
    with check (%I = auth.uid() and is_member(asociatie_id))$p$, tbl, owner_col, owner_col);
end $$;

-- Idempotent re-apply: drop the existing owner policy then recreate it through
-- the tightened generator.
create or replace function reapply_owner_rls(tbl regclass, owner_col text)
returns void language plpgsql as $$
begin
  execute format('drop policy if exists "owner manage" on %s', tbl);
  perform apply_owner_rls(tbl, owner_col);
end $$;

-- Re-apply to every owner-scoped table (matching the apply_owner_rls calls in
-- 20260121000002_features.sql and the feature_ui batches 2/3/4).
select reapply_owner_rls('discussion_messages', 'author_user_id');       -- F02
select reapply_owner_rls('resident_posts', 'author_user_id');            -- F06
select reapply_owner_rls('budget_proposals', 'author_user_id');          -- F12
select reapply_owner_rls('ideas', 'author_user_id');                     -- F14
select reapply_owner_rls('petitions', 'author_user_id');                 -- F16
select reapply_owner_rls('lending_items', 'owner_user_id');              -- F24
select reapply_owner_rls('resident_directory_consent', 'user_id');       -- F36
select reapply_owner_rls('pets', 'owner_user_id');                       -- F37
select reapply_owner_rls('bookings', 'booked_by_user_id');               -- F25/F26/F27
select reapply_owner_rls('bikes', 'owner_user_id');                      -- F29
select reapply_owner_rls('marketplace_listings', 'seller_user_id');      -- F57
select reapply_owner_rls('carpool_profiles', 'user_id');                 -- F58
select reapply_owner_rls('birthdays_consent', 'user_id');                -- F63
select reapply_owner_rls('kids_age_ranges', 'user_id');                  -- F64
select reapply_owner_rls('access_codes', 'generated_by');                -- F32
select reapply_owner_rls('sitter_profiles', 'user_id');                  -- F59
select reapply_owner_rls('skill_offerings', 'user_id');                  -- F60
select reapply_owner_rls('group_buys', 'organizer_user_id');             -- F61
select reapply_owner_rls('group_buy_signups', 'user_id');                -- F61
select reapply_owner_rls('pledges', 'user_id');                          -- F44
select reapply_owner_rls('anonymous_messages', 'sender_user_id');        -- F05
select reapply_owner_rls('contractor_recommendations', 'recommended_by');-- F22
select reapply_owner_rls('duty_volunteers', 'user_id');                  -- F23
select reapply_owner_rls('task_signups', 'user_id');                     -- F31
select reapply_owner_rls('wiki_suggested_edits', 'suggested_by');        -- F39
