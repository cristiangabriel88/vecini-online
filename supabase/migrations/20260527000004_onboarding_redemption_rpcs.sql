-- vecini.online -- onboarding redemption RPCs (T55).
--
-- Two SECURITY DEFINER functions for server-authoritative invite redemption.
-- The offline counterparts (accountSetupLogic + authStore) remain unchanged;
-- these RPCs are called only when isSupabaseConfigured is true.
--
-- resolve_onboarding_token(p_token text)
--   Callable by anon + authenticated. The token acts as a bearer secret so no
--   prior auth is required to preview invite context. Returns minimal context
--   (status, kind, asociatie_name, invitee_name, invitee_email, role) for
--   AccountSetupPage to render the context card before the invitee commits.
--   Never exposes created_by or internal FK ids.
--   Status values: ok / unknown / expired / used / revoked
--   (mirror of inviteLogic.ts validateInvite order: revoked > used > expired > ok)
--
-- redeem_onboarding_token(p_token text, p_full_name text, p_locale text)
--   Callable only by authenticated. Uses auth.uid() + auth email server-side;
--   never trusts a client-supplied role / asociatie_id / kind. Re-validates
--   the token (replay-safe via FOR UPDATE), verifies email match when
--   invitee_email is set, upserts the users row, inserts the membership
--   (admin for admin_setup, invite role for resident_invite), conditionally
--   links apartment_residents, and marks the invite consumed.
--   Additional status: email_mismatch (authenticated email != invitee_email)
--
-- Both functions: SECURITY DEFINER + SET search_path = '' prevents search-path
-- injection; all table references are fully qualified (public.*). PUBLIC execute
-- is revoked and only the intended roles are granted.
-- Idempotent: CREATE OR REPLACE is safe to re-run (supabase db reset / apply).

-- ── resolve_onboarding_token ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.resolve_onboarding_token(p_token text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row        public.invite_codes%ROWTYPE;
  v_assoc_name text;
BEGIN
  -- Reject degenerate inputs before touching the index.
  IF p_token IS NULL OR length(p_token) < 8 THEN
    RETURN json_build_object('status', 'unknown');
  END IF;

  SELECT * INTO v_row
  FROM public.invite_codes
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('status', 'unknown');
  END IF;

  -- Validation order mirrors inviteLogic.ts validateInvite:
  -- revoked > used (if single_use) > expired > ok.
  IF v_row.revoked_at IS NOT NULL THEN
    RETURN json_build_object('status', 'revoked');
  END IF;

  IF v_row.single_use AND v_row.consumed_at IS NOT NULL THEN
    RETURN json_build_object('status', 'used');
  END IF;

  IF v_row.expires_at IS NOT NULL AND now() >= v_row.expires_at THEN
    RETURN json_build_object('status', 'expired');
  END IF;

  -- Resolve the asociatie display name for the context card in AccountSetupPage.
  SELECT name INTO v_assoc_name
  FROM public.asociatii
  WHERE id = v_row.asociatie_id;

  -- Return minimal context; created_by and raw ids are not exposed.
  RETURN json_build_object(
    'status',         'ok',
    'kind',           COALESCE(v_row.kind, 'resident_invite'),
    'asociatie_id',   v_row.asociatie_id::text,
    'asociatie_name', v_assoc_name,
    'invitee_name',   v_row.invitee_name,
    'invitee_email',  v_row.invitee_email,
    'role',           v_row.role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_onboarding_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_onboarding_token(text) TO anon, authenticated;

-- ── redeem_onboarding_token ───────────────────────────────────────────────

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

  -- Re-validate server-side (same order as resolve + inviteLogic.ts; cannot rely
  -- on an earlier resolve call because state may have changed between calls).
  IF v_row.revoked_at IS NOT NULL THEN
    RETURN json_build_object('status', 'revoked');
  END IF;

  IF v_row.single_use AND v_row.consumed_at IS NOT NULL THEN
    RETURN json_build_object('status', 'used');
  END IF;

  IF v_row.expires_at IS NOT NULL AND now() >= v_row.expires_at THEN
    RETURN json_build_object('status', 'expired');
  END IF;

  -- Email ownership check: when the invite was minted for a specific address
  -- the authenticated caller must match it. Case-insensitive trim comparison.
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

  -- Upsert the users row (name + locale from the account-creation form). Uses
  -- the server-resolved email, not anything the client sent.
  INSERT INTO public.users (id, email, full_name, locale, created_at, updated_at)
  VALUES (v_user_id, v_user_email, p_full_name, p_locale, now(), now())
  ON CONFLICT (id) DO UPDATE SET
    full_name  = EXCLUDED.full_name,
    locale     = EXCLUDED.locale,
    updated_at = now();

  -- Insert the membership. ON CONFLICT DO NOTHING makes this idempotent so a
  -- retry after a partial failure does not create a duplicate row.
  INSERT INTO public.memberships (user_id, asociatie_id, role, joined_at)
  VALUES (v_user_id, v_row.asociatie_id, v_membership_role, now())
  ON CONFLICT (user_id, asociatie_id, role) DO NOTHING;

  -- Link to a pre-assigned apartment when the invite carries one and the role
  -- is one the apartment_residents table recognises.
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
