-- T249: Asociatie lifecycle management (suspend / reactivate / archive).
-- Adds status columns to asociatii and a membership insertion guard so suspended
-- or archived tenants cannot onboard new residents.

ALTER TABLE asociatii
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'archived')),
  ADD COLUMN IF NOT EXISTS status_reason text,
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;

-- Helper: returns true when the asociatie may be written to (status = active).
-- Used by RESTRICTIVE RLS policies on write-facing tables.
CREATE OR REPLACE FUNCTION is_asociatie_active(aid uuid)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
      SELECT 1 FROM asociatii
      WHERE id = aid AND status = 'active' AND deleted_at IS NULL
    );
$$;

-- RESTRICTIVE policy: blocks new member joins on suspended/archived asociatii.
-- Permissive INSERT policies still apply; this guard MUST also pass for the row
-- to be inserted. Super-admin service-role writes bypass RLS entirely.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'memberships'
      AND policyname = 'block membership join on inactive asociatii'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "block membership join on inactive asociatii"
        ON memberships AS RESTRICTIVE FOR INSERT
        WITH CHECK (is_asociatie_active(asociatie_id))
    $policy$;
  END IF;
END $$;
