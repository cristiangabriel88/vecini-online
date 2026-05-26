-- vecini.online — Invite codes: optional recipient contact (T146/T147 prep).
-- The apartment edit surface can mint a code for a specific occupant and record
-- their name + email so the invite can later be delivered by email (T147). These
-- two columns carry that recipient on the row, kept in step with the offline
-- InviteCode model (inviteeName / inviteeEmail) in inviteLogic.ts.
--
-- Additive + idempotent: re-running is a no-op. No RLS change: the existing
-- admin-manage policy on invite_codes (init_core.sql) already covers these
-- columns. Nullable, so standing apartment-less codes are unaffected.

alter table invite_codes add column if not exists invitee_name text;
alter table invite_codes add column if not exists invitee_email text;
