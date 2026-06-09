-- vecini.online -- Fix redeem_onboarding_token: use 'locatar' instead of 'chirias'.
--
-- The 20260602000001_rename_chirias_locator_to_locatar migration renamed the
-- 'chirias' role to 'locatar' in invite_codes, memberships, and apartment_residents,
-- but did not update the redeem_onboarding_token RPC. As a result, invites with
-- role = 'locatar' did not create an apartment_residents row on redemption because
-- the old check was `v_role IN ('proprietar', 'chirias')`.
--
-- This migration replaces the function with the corrected check.

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
  v_token_hash      text;
  v_attempt_count   bigint;
  v_row             public.invite_codes%ROWTYPE;
  v_kind            text;
  v_role            text;
  v_membership_role text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  IF p_token IS NULL OR length(p_token) < 8 THEN
    RETURN json_build_object('status', 'unknown');
  END IF;

  v_token_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  SELECT COUNT(*) INTO v_attempt_count
  FROM public.token_redemption_attempts
  WHERE token_hash = v_token_hash
    AND attempted_at > now() - INTERVAL '15 minutes';

  IF v_attempt_count >= 10 THEN
    RETURN json_build_object('status', 'rate_limited');
  END IF;

  SELECT * INTO v_row
  FROM public.invite_codes
  WHERE token = v_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('status', 'unknown');
  END IF;

  INSERT INTO public.token_redemption_attempts (token_hash, attempted_at)
  VALUES (v_token_hash, now());

  IF v_row.revoked_at IS NOT NULL THEN
    RETURN json_build_object('status', 'revoked');
  END IF;

  IF v_row.single_use AND v_row.consumed_at IS NOT NULL THEN
    RETURN json_build_object('status', 'used');
  END IF;

  IF v_row.expires_at IS NOT NULL AND now() >= v_row.expires_at THEN
    RETURN json_build_object('status', 'expired');
  END IF;

  IF v_row.invitee_email IS NOT NULL
     AND lower(trim(v_row.invitee_email)) != lower(trim(COALESCE(v_user_email, '')))
  THEN
    RETURN json_build_object('status', 'email_mismatch');
  END IF;

  v_kind := COALESCE(v_row.kind, 'resident_invite');
  v_role := v_row.role;

  v_membership_role := CASE WHEN v_kind = 'admin_setup' THEN 'admin' ELSE v_role END;

  INSERT INTO public.users (id, email, full_name, locale, created_at, updated_at)
  VALUES (v_user_id, v_user_email, p_full_name, p_locale, now(), now())
  ON CONFLICT (id) DO UPDATE SET
    full_name  = EXCLUDED.full_name,
    locale     = EXCLUDED.locale,
    updated_at = now();

  INSERT INTO public.memberships (user_id, asociatie_id, role, joined_at)
  VALUES (v_user_id, v_row.asociatie_id, v_membership_role, now())
  ON CONFLICT (user_id, asociatie_id, role) DO NOTHING;

  -- Fixed: use 'locatar' (renamed from 'chirias' in 20260602000001).
  IF v_row.apartment_id IS NOT NULL
     AND v_role IN ('proprietar', 'locatar')
  THEN
    INSERT INTO public.apartment_residents
      (apartment_id, user_id, role, is_primary, moved_in_at)
    SELECT v_row.apartment_id, v_user_id, v_role, true, CURRENT_DATE
    WHERE NOT EXISTS (
      SELECT 1 FROM public.apartment_residents
      WHERE apartment_id = v_row.apartment_id AND user_id = v_user_id
    );
  END IF;

  UPDATE public.invite_codes
  SET consumed_at = now(), consumed_by_user_id = v_user_id
  WHERE id = v_row.id;

  INSERT INTO public.audit_log (
    id, asociatie_id, actor_user_id, created_at,
    action, entity, entity_label, after_value
  ) VALUES (
    gen_random_uuid(),
    v_row.asociatie_id,
    v_user_id,
    now(),
    'invite.redeemed',
    'invite',
    COALESCE(v_row.invitee_name, p_full_name),
    v_membership_role
  );

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
