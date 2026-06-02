-- Rename 'chirias' and 'locator' roles to 'locatar' (the legally correct term;
-- 'chirias' / 'chiriasi' is the colloquial name).

-- apartment_residents: data + constraint
update apartment_residents set role = 'locatar' where role in ('chirias', 'locator');
alter table apartment_residents drop constraint if exists apartment_residents_role_check;
alter table apartment_residents add constraint apartment_residents_role_check
  check (role in ('proprietar', 'locatar'));

-- memberships: data + constraint
update memberships set role = 'locatar' where role = 'chirias';
alter table memberships drop constraint if exists memberships_role_check;
alter table memberships add constraint memberships_role_check
  check (role in ('admin', 'presedinte', 'comitet', 'cenzor', 'proprietar', 'locatar'));

-- invite_codes: data + constraint
update invite_codes set role = 'locatar' where role = 'chirias';
alter table invite_codes drop constraint if exists invite_codes_role_check;
alter table invite_codes add constraint invite_codes_role_check
  check (role in ('proprietar', 'locatar', 'comitet', 'cenzor', 'presedinte'));
