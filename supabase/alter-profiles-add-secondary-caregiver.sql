-- Adds an optional secondary caregiver/org contact to profiles.
alter table public.profiles
  add column if not exists caregiver_org_name text,
  add column if not exists caregiver_org_phone text,
  add column if not exists caregiver_org_email text;
