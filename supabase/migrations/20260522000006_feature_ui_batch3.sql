-- IntreVecini — additive RLS for the features built out with UI in batch 3
-- (F16, F19, F28, F44, F46, F51, F52, F53). The base tables and standard RLS
-- (members read · comitet write) already ship in 20260121000002_features.sql.
--
-- Most of these features are comitet/admin-managed and need no extra policy:
--   F19 scheduled_maintenance, F28 parking_*, F51 psi_*, F52 insurance_*,
--   F53 keys/key_handovers — standard RLS already matches their audience.
--   F46 is a pure calculator with no table.
--   F16 petitions already carries an owner policy (author may edit own petition).
--
-- This migration layers an "owner may manage own row" policy on the one
-- resident-contributed table introduced here: F44 pledges, so a resident can
-- record and withdraw their own pledge without comitet rights.

select apply_owner_rls('pledges', 'user_id');   -- F44 crowdfunding pledges
