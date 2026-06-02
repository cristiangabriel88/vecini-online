-- Add category to pv_documents (present in the client domain type since day one
-- but omitted from the initial table definition). Nullable so existing rows are
-- not invalidated; the API layer defaults null to 'Altele'.
alter table pv_documents add column if not exists category text;
