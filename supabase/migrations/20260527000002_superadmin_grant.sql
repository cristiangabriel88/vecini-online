-- vecini.online -- T169: least-privilege execute grants for is_super_admin()
-- + documented seed path for the first platform superadmin.
--
-- WHY: Postgres grants EXECUTE on functions to PUBLIC by default. This means
-- the `is_super_admin()` helper (T91) is callable by the `anon` role
-- (unauthenticated Supabase requests), which is not the intent: only a
-- signed-in user should invoke the platform gate check. Leaving PUBLIC EXECUTE
-- open also means any future caller (a new Supabase role, an Edge Function
-- running as anon) would silently have access to the function.
--
-- WHAT:
--   1. Revoke the PUBLIC default so neither `anon` nor any other inheriting
--      role can call `is_super_admin()`.
--   2. Revoke explicitly from `anon` (belt-and-suspenders: the revoke-from-PUBLIC
--      is sufficient, but the explicit anon revoke documents the intent and
--      survives any future accidental `GRANT ... TO PUBLIC`).
--   3. Grant EXECUTE to `authenticated` only -- the role Supabase assigns to
--      every signed-in user session. `platformAuthStore.verify()` calls
--      `supabase.rpc('is_super_admin')` only when a session exists, so the
--      authenticated-only grant is the correct least-privilege boundary.
--
-- SEED PATH (live activation -- do NOT commit real user ids here):
-- After the live Supabase auth user for the superadmin is created (via the
-- Supabase dashboard or the Hermes migration agent), add them to the roster
-- by running the following as the service role (Supabase dashboard SQL editor
-- or a Hermes agent script -- the service role bypasses RLS so the INSERT
-- succeeds even though no INSERT policy exists on platform_admins):
--
--   INSERT INTO platform_admins (user_id, granted_by, note)
--   SELECT id, id, 'Initial superadmin -- bootstrapped'
--   FROM auth.users
--   WHERE email = '<SUPERADMIN_EMAIL>'
--   ON CONFLICT (user_id) DO NOTHING;
--
-- Replace <SUPERADMIN_EMAIL> with the real superadmin email address before
-- running. Never commit the real address or user id to the repo. The Hermes
-- agent applies this statement separately after the auth user is created.
--
-- IDEMPOTENT: REVOKE/GRANT on functions are idempotent in Postgres (revoking
-- a privilege not held is a no-op; granting one already held is a no-op), so
-- this migration is safe to re-apply on `supabase db reset`.

-- Step 1: remove the PUBLIC default execute right.
REVOKE EXECUTE ON FUNCTION is_super_admin() FROM PUBLIC;

-- Step 2: explicit anon revoke (intent-documenting, survives future grants).
REVOKE EXECUTE ON FUNCTION is_super_admin() FROM anon;

-- Step 3: grant to signed-in users only.
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
