-- vecini.online -- Token-security hardening (T128).
--
-- Three-part hardening for onboarding and invite tokens:
--
--   1. HASH AT REST: The plaintext token is never stored. The link carries the
--      only plaintext copy; both RPCs compute sha256(p_token) and look up by
--      hash, so a DB dump exposes only digests from which the original token
--      cannot be recovered.
--
--   2. RATE LIMIT: Per-token redemption attempts are tracked in a tight,
--      no-public-access table. After 10 attempts within 15 minutes the
--      redeem RPC returns 'rate_limited'. Tracking starts only when the
--      token hash is found (prevents unbounded row insertion from random
--      garbage inputs).
--
--   3. AUDIT: A successful redemption writes an 'invite.redeemed' entry to
--      audit_log attributed to the redeemer. The SECURITY DEFINER context
--      bypasses user-level RLS; the users row exists (upserted earlier in
--      the same function) so the FK is satisfied.
--
-- The offline demo path is unchanged: AccountSetupPage uses its local token
-- lookup and local audit store when isSupabaseConfigured is false.
--
-- Constants:
--   RATE_LIMIT_WINDOW  = 15 minutes
--   RATE_LIMIT_MAX     = 10 attempts per token per window
--
-- Prerequisites: pgcrypto (enabled below); resolve_onboarding_token and
-- redeem_onboarding_token from migration 20260527000004.

-- ── pgcrypto ──────────────────────────────────────────────────────────────────
-- Required for digest() (sha256). Safe to run even if already enabled.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. Hash existing tokens at rest ──────────────────────────────────────────
-- Overwrite every non-null plaintext token with its sha256 hex digest.
-- The unique partial index (invite_codes_token_unique_idx) remains valid:
-- sha256 digests are also 64 lower-case hex chars and unique for distinct
-- plaintext tokens.
UPDATE public.invite_codes
SET token = encode(digest(token, 'sha256'), 'hex')
WHERE token IS NOT NULL;

-- ── 2. Rate-limit tracking table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.token_redemption_attempts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash   text        NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_token_redemption_token_time
  ON public.token_redemption_attempts(token_hash, attempted_at);

ALTER TABLE public.token_redemption_attempts ENABLE ROW LEVEL SECURITY;
-- No public-facing policies: only SECURITY DEFINER RPCs may insert/read.
-- This makes the table completely invisible and write-protected for any
-- client connection (anon or authenticated).

-- ── 3. Updated resolve_onboarding_token: hash before lookup ──────────────────

CREATE OR REPLACE FUNCTION public.resolve_onboarding_token(p_token text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_token_hash text;
  v_row        public.invite_codes%ROWTYPE;
  v_assoc_name text;
BEGIN
  -- Reject degenerate inputs before touching the index.
  IF p_token IS NULL OR length(p_token) < 8 THEN
    RETURN json_build_object('status', 'unknown');
  END IF;

  -- Hash the plaintext token; lookup is always by hash (T128).
  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_row
  FROM public.invite_codes
  WHERE token = v_token_hash;

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

-- ── 4. Updated redeem_onboarding_token: hash + rate limit + audit ─────────────

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

  -- Hash the plaintext token; lookup is always by hash (T128).
  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  -- Rate-limit check: count attempts for this token hash in the last 15 min.
  -- We check before locking the invite row to fail fast without a row lock.
  SELECT COUNT(*) INTO v_attempt_count
  FROM public.token_redemption_attempts
  WHERE token_hash = v_token_hash
    AND attempted_at > now() - INTERVAL '15 minutes';

  IF v_attempt_count >= 10 THEN
    RETURN json_build_object('status', 'rate_limited');
  END IF;

  -- Lock the invite row for the duration of this transaction so a concurrent
  -- redemption of the same single-use token cannot pass the consumed_at check
  -- simultaneously. After the first transaction commits the second sees
  -- consumed_at set and returns 'used'.
  SELECT * INTO v_row
  FROM public.invite_codes
  WHERE token = v_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('status', 'unknown');
  END IF;

  -- Record this redemption attempt now that we know the token hash is real.
  -- Tracking only for known tokens prevents unbounded table growth from
  -- random/garbage inputs while still protecting against replay attacks on
  -- intercepted tokens.
  INSERT INTO public.token_redemption_attempts (token_hash, attempted_at)
  VALUES (v_token_hash, now());

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

  -- Audit the successful redemption (T128). The users row was upserted above
  -- so the actor_user_id FK is satisfied. seq/prev_hash/hash are left NULL
  -- (nullable per the audit_log schema): the client-side Zustand chain is the
  -- tamper-evident layer; this server-side row is the reliability fallback so
  -- the event is recorded even if the client disconnects before calling
  -- recordAudit(). SECURITY DEFINER bypasses RLS (no update/delete grant exists
  -- for anyone so the log remains append-only).
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
