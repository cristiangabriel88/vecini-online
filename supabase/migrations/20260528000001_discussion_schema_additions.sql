-- vecini.online — add title to discussion_threads and author_name to
-- discussion_messages so client-side reads map directly onto the domain model
-- without requiring a join to the self-read-only users table (T57).
alter table discussion_threads add column if not exists title text;
alter table discussion_messages add column if not exists author_name text;
