-- T258a: add release + stage columns to platform_error_reports.
-- These tag each client error report with the build id (git SHA or CI ref)
-- and the deployment stage (prod | dev | demo) so errors can be correlated
-- with specific deploys. Nullable: reports from before this migration have
-- no release/stage and are still readable.

ALTER TABLE platform_error_reports
  ADD COLUMN IF NOT EXISTS release text,
  ADD COLUMN IF NOT EXISTS stage   text;
