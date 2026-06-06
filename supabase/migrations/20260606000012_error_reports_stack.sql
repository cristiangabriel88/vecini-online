-- vecini.online -- T258b: add stack column to platform_error_reports
--
-- Stores the scrubbed stack trace alongside the existing error fields so
-- the platform console can display and symbolicate raw frames. Column is
-- nullable for backward compatibility with pre-T258b reports.

alter table platform_error_reports
  add column if not exists stack text;
