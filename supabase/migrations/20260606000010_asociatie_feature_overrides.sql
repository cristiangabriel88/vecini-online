-- T256: Per-tenant feature-flag overrides.
-- Platform operators can force-enable or force-disable a feature for one
-- asociatie, overriding the admin-managed defaults in asociatie_features.
-- Service-role writes bypass RLS; the SELECT policy lets members hydrate their
-- own tenant's overrides in the resident app.

CREATE TABLE IF NOT EXISTS asociatie_feature_overrides (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  asociatie_id      uuid          NOT NULL REFERENCES asociatii(id) ON DELETE CASCADE,
  feature_key       text          NOT NULL,
  override_enabled  boolean       NOT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (asociatie_id, feature_key)
);

CREATE INDEX IF NOT EXISTS asociatie_feature_overrides_asoc_idx
  ON asociatie_feature_overrides (asociatie_id);

ALTER TABLE asociatie_feature_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read own overrides"
  ON asociatie_feature_overrides
  FOR SELECT
  USING (is_member(asociatie_id));
