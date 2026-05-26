-- vecini.online — T137: close the within-tenant privacy leak on anonymous_messages.
--
-- F05 ("Mesaj anonim") lets a resident raise a concern with the comitet without
-- revealing who sent it. The row stores sender_user_id "for abuse prevention but
-- hidden from the comitet at the app layer" (src/shared/types/domain.ts). But
-- anonymous_messages shipped in 20260121000002_features.sql with the standard
-- apply_standard_rls policies, so:
--   * "members read" (is_member) let EVERY member of the asociatie SELECT EVERY
--     row, sender_user_id included — the anonymity was app-layer only;
--   * "comitet write" (for all) gave the comitet the same blanket per-row read.
-- sender_user_id is real PII: the GDPR art. 15 export keys the subject's own
-- anonymous messages off it (src/features/gdpr/gdprLogic.ts). This is the same
-- false-anonymity class fixed for survey_responses/votes/priority_rankings in
-- T38 (20260522000020_response_privacy.sql); fix it the same way.
--
-- Model after this migration:
--   * Sender — keeps the least-privilege "owner manage" policy
--     (reapply_owner_rls, 20260522000013): selects/inserts/updates/deletes ONLY
--     their own rows (sender_user_id = auth.uid() and is_member). This is what
--     lets a resident submit, withdraw, and export their own anonymous messages.
--   * Comitet/president/admin — NO direct table policy at all, so they can never
--     read sender_user_id by any query. They triage through two SECURITY DEFINER
--     functions instead (the T38 "privileged op via definer function" pattern):
--       - anonymous_messages_for_comitet(asociatie) returns the inbox WITHOUT
--         sender_user_id;
--       - set_anonymous_message_status(id, status) flips only the status column,
--         never touching body or identity.
--   * Other members — no access (an anonymous inbox is not a member-wide read).
--
-- Additive and idempotent: every drop is guarded and every function is
-- re-creatable. apply_standard_rls('anonymous_messages') in the base migration
-- still runs first (enabling RLS); this migration only narrows the policies.

-- Re-assert RLS is on (idempotent; the base migration already enabled it).
alter table anonymous_messages enable row level security;

-- Drop the over-permissive standard policies. The "owner manage" policy from
-- reapply_owner_rls (20260522000013) is intentionally kept.
drop policy if exists "members read" on anonymous_messages;
drop policy if exists "comitet write" on anonymous_messages;

-- ── Comitet inbox read (SECURITY DEFINER, sender-less) ───────────────────────
-- Reads past RLS to return every message for the asociatie, but projects only
-- body/status/created_at — never sender_user_id — and gates on the privileged
-- role set, so a non-comitet caller gets no rows. STABLE; fixed search_path so a
-- hostile search_path cannot shadow the source table (matching is_member/has_role
-- and the T38 tally functions).
create or replace function anonymous_messages_for_comitet(p_asociatie_id uuid)
returns table (id uuid, asociatie_id uuid, body text, status text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, m.asociatie_id, m.body, m.status, m.created_at
  from anonymous_messages m
  where m.asociatie_id = p_asociatie_id
    and has_role(p_asociatie_id, array['admin','presedinte','comitet'])
  order by m.created_at desc;
$$;

-- ── Comitet status triage (SECURITY DEFINER, status-only) ────────────────────
-- The only mutation the comitet performs on an anonymous message is flipping its
-- status. A definer function keeps that column-safe (body and sender_user_id can
-- never be rewritten through it) and identity-safe (nothing is returned), gated
-- on the privileged role for the message's own asociatie.
create or replace function set_anonymous_message_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_asociatie_id uuid;
begin
  select asociatie_id into v_asociatie_id from anonymous_messages where id = p_id;
  if v_asociatie_id is null then
    raise exception 'anonymous message not found';
  end if;
  if not has_role(v_asociatie_id, array['admin','presedinte','comitet']) then
    raise exception 'insufficient privilege to triage anonymous messages';
  end if;
  if p_status not in ('nou', 'rezolvat') then
    raise exception 'invalid anonymous message status: %', p_status;
  end if;
  update anonymous_messages set status = p_status where id = p_id;
end $$;
