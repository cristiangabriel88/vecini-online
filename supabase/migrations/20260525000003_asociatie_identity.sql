-- T122: capture the full asociație identity (bank account + contact) up front.
-- Additive and idempotent: extends the asociatii table with the IBAN and contact
-- details so superadmin provisioning and the admin building-settings page can
-- persist them once the live write path (T92/T120) is active. RLS is unchanged:
-- the existing "members read asociatie" / "admins update asociatie" policies on
-- asociatii already cover the new columns.
alter table asociatii add column if not exists iban text;
alter table asociatii add column if not exists contact_phone text;
alter table asociatii add column if not exists contact_email text;
