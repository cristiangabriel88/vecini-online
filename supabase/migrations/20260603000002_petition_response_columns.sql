-- T205: petition committee-response columns
-- response text already exists from 20260121000002_features.sql
alter table petitions
  add column if not exists responded_at timestamptz,
  add column if not exists responded_by_name text;
