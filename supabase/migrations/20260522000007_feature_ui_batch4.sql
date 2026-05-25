-- vecini.online — additive RLS for the features built out with UI in batch 4
-- (F05, F11, F22, F23, F31, F39, F43, F55). The base tables and standard RLS
-- (members read · comitet write) already ship in 20260121000002_features.sql.
--
-- Most of these features are comitet/admin-managed and need no extra policy:
--   F11 pv_documents, F22 rfps/rfp_quotes, F43 contractors/contractor_ratings,
--   F55 alarm_systems/alarm_events — standard RLS already matches their audience.
--
-- This migration layers an "owner may manage own row" policy on the
-- resident-contributed tables introduced here, so a resident can record and
-- withdraw their own contribution without comitet rights.

select apply_owner_rls('anonymous_messages', 'sender_user_id'); -- F05 anonymous sender manages own
select apply_owner_rls('contractor_recommendations', 'recommended_by'); -- F22 resident contractor tips
select apply_owner_rls('duty_volunteers', 'user_id');           -- F23 resident signs up for duty
select apply_owner_rls('task_signups', 'user_id');              -- F31 resident signs up for a green task
select apply_owner_rls('wiki_suggested_edits', 'suggested_by'); -- F39 resident suggests a wiki edit
