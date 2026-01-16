-- Adds caregiver contact fields to profiles so we can reuse them across meds.
alter table public.profiles
  add column if not exists caregiver_name text,
  add column if not exists caregiver_phone text,
  add column if not exists caregiver_email text;
