-- T33: server-backed login lockout.
-- Records failed sign-in attempts per email hash (no PII stored) so the
-- lockout cannot be reset by clearing localStorage. Access is exclusively
-- through the three SECURITY DEFINER functions below; direct table access
-- is revoked from all non-superuser roles.

CREATE TABLE login_attempt_locks (
  email_hash    text        PRIMARY KEY,
  failure_count int         NOT NULL DEFAULT 0,
  window_start  timestamptz NOT NULL DEFAULT now(),
  locked_until  timestamptz,
  lockout_count int         NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- RLS enabled; all access goes through the SECURITY DEFINER functions below,
-- which run as the function owner and bypass RLS. No policies are needed.
ALTER TABLE login_attempt_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON login_attempt_locks FROM anon, authenticated;

-- Returns (locked, remaining_ms) for the given email hash.
-- remaining_ms is 0 when not locked, otherwise the ms until the lock expires.
CREATE OR REPLACE FUNCTION check_login_lock(p_email_hash text)
RETURNS TABLE(locked boolean, remaining_ms float8)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    locked_until IS NOT NULL AND locked_until > now(),
    GREATEST(0.0, EXTRACT(EPOCH FROM locked_until - now()) * 1000)::float8
  FROM login_attempt_locks
  WHERE email_hash = p_email_hash
  UNION ALL
  SELECT false, 0.0
  WHERE NOT EXISTS (
    SELECT 1 FROM login_attempt_locks WHERE email_hash = p_email_hash
  );
$$;

-- Records one failed attempt; applies an escalating lock when the threshold
-- (5 failures in a 15-minute window) is reached. Mirrors the client-side
-- constants in loginThrottle.ts (MAX_FAILURES=5, FAILURE_WINDOW_MS=15min,
-- LOCKOUT_BASE_MS=60s, MAX_LOCKOUT_MS=30min). Returns (locked, remaining_ms).
CREATE OR REPLACE FUNCTION record_login_failure(p_email_hash text)
RETURNS TABLE(locked boolean, remaining_ms float8)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row       login_attempt_locks%ROWTYPE;
  v_dur_ms    bigint;
  v_lock_till timestamptz;
BEGIN
  INSERT INTO login_attempt_locks (email_hash, failure_count, window_start)
  VALUES (p_email_hash, 1, now())
  ON CONFLICT (email_hash) DO UPDATE SET
    failure_count = CASE
      WHEN login_attempt_locks.locked_until IS NOT NULL
           AND login_attempt_locks.locked_until > now()
        THEN login_attempt_locks.failure_count
      WHEN now() - login_attempt_locks.window_start > INTERVAL '15 minutes'
        THEN 1
      ELSE login_attempt_locks.failure_count + 1
    END,
    window_start = CASE
      WHEN login_attempt_locks.locked_until IS NOT NULL
           AND login_attempt_locks.locked_until > now()
        THEN login_attempt_locks.window_start
      WHEN now() - login_attempt_locks.window_start > INTERVAL '15 minutes'
        THEN now()
      ELSE login_attempt_locks.window_start
    END,
    updated_at = now()
  RETURNING * INTO v_row;

  IF v_row.locked_until IS NOT NULL AND v_row.locked_until > now() THEN
    RETURN QUERY SELECT true,
      GREATEST(0.0, EXTRACT(EPOCH FROM v_row.locked_until - now()) * 1000)::float8;
    RETURN;
  END IF;

  IF v_row.failure_count >= 5 THEN
    v_dur_ms := LEAST((60000 * power(2, v_row.lockout_count))::bigint, 1800000);
    v_lock_till := now() + make_interval(secs => v_dur_ms::float8 / 1000.0);
    UPDATE login_attempt_locks SET
      locked_until  = v_lock_till,
      lockout_count = lockout_count + 1,
      failure_count = 0,
      updated_at    = now()
    WHERE email_hash = p_email_hash;
    RETURN QUERY SELECT true,
      GREATEST(0.0, EXTRACT(EPOCH FROM v_lock_till - now()) * 1000)::float8;
    RETURN;
  END IF;

  RETURN QUERY SELECT false, 0.0::float8;
END;
$$;

-- Clears the lock and failure counter on a successful sign-in.
CREATE OR REPLACE FUNCTION clear_login_lock(p_email_hash text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE login_attempt_locks SET
    failure_count = 0,
    locked_until  = NULL,
    lockout_count = 0,
    updated_at    = now()
  WHERE email_hash = p_email_hash;
$$;

GRANT EXECUTE ON FUNCTION check_login_lock(text)     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_login_failure(text)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION clear_login_lock(text)      TO anon, authenticated;
