-- Allow any asociatie member to submit meter readings (F20, T213).
-- The standard_rls "comitet write" covers admin-only updates; this additional
-- INSERT policy lets resident members submit their own readings.
create policy "member submit reading" on meter_readings
  for insert
  with check (is_member(asociatie_id) and submitted_by = auth.uid());
