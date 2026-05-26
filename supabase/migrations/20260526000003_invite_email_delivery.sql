-- vecini.online — Invite codes: email delivery markers (T147).
-- The apartment / invites surfaces can deliver an invitation email carrying the
-- onboarding link. These two columns record the delivery lifecycle on the row,
-- kept in step with the offline InviteCode model (emailSentAt / emailDeliveredAt)
-- in inviteLogic.ts:
--   invite_email_sent_at      — set when the `invite-email` function dispatches
--                               the email (offline: stamped on trigger).
--   invite_email_delivered_at — set from a Resend delivery webhook (live only;
--                               always null offline).
--
-- Additive + idempotent: re-running is a no-op. No RLS change: the existing
-- admin-manage policy on invite_codes (init_core.sql) already covers these
-- columns. Both nullable, so standing apartment-less codes are unaffected.

alter table invite_codes add column if not exists invite_email_sent_at timestamptz;
alter table invite_codes add column if not exists invite_email_delivered_at timestamptz;
