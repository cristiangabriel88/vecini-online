-- vecini.online — Invite codes: Resend message id for delivery webhook (T149).
-- The `invite-email` Netlify function stores the Resend message id returned on a
-- successful send; the `resend-webhook` function looks up the matching invite row
-- by this id when a delivery or bounce event fires so the stamp is precise (no
-- fuzzy matching by email address needed).
--
-- Additive + idempotent: re-running is a no-op. The existing RLS policies on
-- invite_codes cover this column -- no new policy needed.

alter table invite_codes add column if not exists resend_message_id text;
