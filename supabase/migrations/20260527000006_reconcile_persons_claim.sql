-- vecini.online -- persons reconciliation: claim matching persons entry on redemption (T117).
--
-- When a resident redeems an invite that links to an apartment, `redeem_onboarding_token`
-- now also sets `claimed_user_id` on the best-matching entry in the apartment's `persons`
-- jsonb array. This keeps the pre-account (admin-entered) embedded list in sync with the
-- account-linked `apartment_residents` row so the two views do not drift.
--
-- Match order (mirrors claimPersonInList in apartmentsLogic.ts):
--   1. First unclaimed entry whose name (case-insensitive trim) equals invitee_name.
--   2. Fallback: first unclaimed entry whose role matches the invite role.
--   No-op when no match is found or when the persons array is null/empty.
--
-- The `claimed_user_id` key lives inside the jsonb object; no DDL migration is needed
-- (existing rows without this key are treated as unclaimed, which is correct).
--
-- Idempotent: CREATE OR REPLACE replaces the function in-place. GRANT/REVOKE are
-- re-applied to match the original (authenticated only; PUBLIC execute revoked).

CREATE OR REPLACE FUNCTION public.redeem_onboarding_token(
  p_token     text,
  p_full_name text,
  p_locale    text
)
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id         uuid;
  v_user_email      text;
  v_row             public.invite_codes%ROWTYPE;
  v_kind            text;
  v_role            text;
  v_membership_role text;
  v_persons         jsonb;
  v_claim_idx       int;
  v_idx             int;
  v_elem            jsonb;
BEGIN
  -- auth.uid() returns null for anon callers; reject immediately.
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Retrieve the caller's verified email from auth.users (server-authoritative;
  -- never trusts a client-supplied email).
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  IF p_token IS NULL OR length(p_token) < 8 THEN
    RETURN json_build_object('status', 'unknown');
  END IF;

  -- Lock the invite row for the duration of this transaction so a concurrent
  -- redemption of the same single-use token cannot pass the consumed_at check
  -- simultaneously. After the first transaction commits the second sees
  -- consumed_at set and returns 'used'.
  SELECT * INTO v_row
  FROM public.invite_codes
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('status', 'unknown');
  END IF;

  -- Re-validate server-side (same order as resolve + inviteLogic.ts).
  IF v_row.revoked_at IS NOT NULL THEN
    RETURN json_build_object('status', 'revoked');
  END IF;

  IF v_row.single_use AND v_row.consumed_at IS NOT NULL THEN
    RETURN json_build_object('status', 'used');
  END IF;

  IF v_row.expires_at IS NOT NULL AND now() >= v_row.expires_at THEN
    RETURN json_build_object('status', 'expired');
  END IF;

  -- Email ownership check.
  IF v_row.invitee_email IS NOT NULL
     AND lower(trim(v_row.invitee_email)) != lower(trim(COALESCE(v_user_email, '')))
  THEN
    RETURN json_build_object('status', 'email_mismatch');
  END IF;

  v_kind := COALESCE(v_row.kind, 'resident_invite');
  v_role := v_row.role;

  -- admin_setup always grants 'admin'; invite_codes.role cannot hold 'admin' per
  -- its check constraint so this branch is always reached for admin_setup kinds.
  v_membership_role := CASE WHEN v_kind = 'admin_setup' THEN 'admin' ELSE v_role END;

  -- Upsert the users row (name + locale from the account-creation form).
  INSERT INTO public.users (id, email, full_name, locale, created_at, updated_at)
  VALUES (v_user_id, v_user_email, p_full_name, p_locale, now(), now())
  ON CONFLICT (id) DO UPDATE SET
    full_name  = EXCLUDED.full_name,
    locale     = EXCLUDED.locale,
    updated_at = now();

  -- Insert the membership. ON CONFLICT DO NOTHING makes this idempotent.
  INSERT INTO public.memberships (user_id, asociatie_id, role, joined_at)
  VALUES (v_user_id, v_row.asociatie_id, v_membership_role, now())
  ON CONFLICT (user_id, asociatie_id, role) DO NOTHING;

  -- Link to a pre-assigned apartment and claim the matching persons entry.
  IF v_row.apartment_id IS NOT NULL
     AND v_role IN ('proprietar', 'chirias')
  THEN
    INSERT INTO public.apartment_residents
      (apartment_id, user_id, role, is_primary, moved_in_at)
    SELECT v_row.apartment_id, v_user_id, v_role, true, CURRENT_DATE
    WHERE NOT EXISTS (
      SELECT 1 FROM public.apartment_residents
      WHERE apartment_id = v_row.apartment_id AND user_id = v_user_id
    );

    -- Claim the matching persons entry so the embedded list stays in sync
    -- with the account-linked apartment_residents row (T117).
    SELECT persons INTO v_persons
    FROM public.apartments
    WHERE id = v_row.apartment_id;

    IF v_persons IS NOT NULL AND jsonb_array_length(v_persons) > 0 THEN
      v_claim_idx := -1;

      -- Pass 1: name match on unclaimed entries (requires a non-empty invitee_name).
      IF trim(COALESCE(v_row.invitee_name, '')) <> '' THEN
        FOR v_idx IN 0 .. jsonb_array_length(v_persons) - 1 LOOP
          v_elem := v_persons -> v_idx;
          IF (v_elem ->> 'claimed_user_id') IS NULL
             AND lower(trim(v_elem ->> 'name')) = lower(trim(v_row.invitee_name))
          THEN
            v_claim_idx := v_idx;
            EXIT;
          END IF;
        END LOOP;
      END IF;

      -- Pass 2: role fallback -- first unclaimed entry with the matching role.
      IF v_claim_idx = -1 THEN
        FOR v_idx IN 0 .. jsonb_array_length(v_persons) - 1 LOOP
          v_elem := v_persons -> v_idx;
          IF (v_elem ->> 'claimed_user_id') IS NULL
             AND (v_elem ->> 'role') = v_role
          THEN
            v_claim_idx := v_idx;
            EXIT;
          END IF;
        END LOOP;
      END IF;

      -- Patch the matched element with claimed_user_id.
      IF v_claim_idx >= 0 THEN
        UPDATE public.apartments
        SET persons = jsonb_set(
          persons,
          ARRAY[v_claim_idx::text],
          (persons -> v_claim_idx) || jsonb_build_object('claimed_user_id', v_user_id::text),
          false
        )
        WHERE id = v_row.apartment_id;
      END IF;
    END IF;
  END IF;

  -- Mark the invite consumed (audit trail; prevents single-use replay).
  UPDATE public.invite_codes
  SET consumed_at = now(), consumed_by_user_id = v_user_id
  WHERE id = v_row.id;

  RETURN json_build_object(
    'status',       'ok',
    'asociatie_id', v_row.asociatie_id::text,
    'role',         v_membership_role,
    'kind',         v_kind
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_onboarding_token(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_onboarding_token(text, text, text) TO authenticated;
