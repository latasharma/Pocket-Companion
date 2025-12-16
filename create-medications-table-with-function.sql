-- File: create-medications-table-with-function.sql
-- Purpose: Create medications and medication_intake_logs tables, add indexes and example RLS policies,
-- and provide a convenience RPC to insert a medication that sets user_id = auth.uid().
-- NOTE: Run this in your Supabase SQL editor or psql connected to the database.

-- Ensure pgcrypto is available for gen_random_uuid()
create extension if not exists pgcrypto;

---------------------------------------------------------------------
-- Table: medications
---------------------------------------------------------------------
create table if not exists medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  entry_method text not null, -- manual / image
  medication_name text not null,
  medication_type text not null,
  dosage_value numeric not null,
  dosage_unit text not null,
  instructions text,

  frequency_type text not null, -- once / daily / weekly / custom
  times_per_day integer not null,
  dose_times time[], -- list of times (time without timezone)
  repeat_days text[], -- e.g., ['mon','wed','fri']
  start_date date not null,
  end_date date,
  timezone text not null,

  reminder_enabled boolean default true,
  notification_type text[] not null, -- e.g., ['push','in_app','voice','email']
  pre_reminder_time integer, -- minutes before
  snooze_enabled boolean default false,
  snooze_interval integer, -- minutes
  missed_dose_alert boolean default false,

  total_quantity integer,
  dose_consumption integer,
  refill_threshold integer,
  refill_reminder_enabled boolean default false,

  prescribed_by text,
  hospital_or_clinic text,
  prescription_notes text,

  status text default 'active', -- active / snoozed / paused / archived
  is_deleted boolean default false,
  deleted_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Helpful indexes
create index if not exists idx_medications_user_id on medications (user_id);
create index if not exists idx_medications_reminder_time on medications ((start_date)); -- for date-range scans

---------------------------------------------------------------------
-- Table: medication_intake_logs
---------------------------------------------------------------------
create table if not exists medication_intake_logs (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid references medications(id) on delete cascade,
  scheduled_time timestamptz not null,
  taken_time timestamptz,
  dose_status text not null, -- taken / missed / skipped
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_intake_logs_medication_id on medication_intake_logs (medication_id);
create index if not exists idx_intake_logs_scheduled_time on medication_intake_logs (scheduled_time);

---------------------------------------------------------------------
-- Row-Level Security (RLS) policies
-- Restrict access so users can only operate on their own medications and logs.
---------------------------------------------------------------------
-- Enable RLS on medications and logs
alter table medications enable row level security;
alter table medication_intake_logs enable row level security;

-- Allow authenticated users to select/insert/update/delete only rows they own in `medications`
create policy "Medications: user owns row" on medications
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- For intake logs, allow actions only when the linked medication belongs to the user.
-- This uses an existence check against medications.
create policy "IntakeLogs: owner via medication" on medication_intake_logs
  for all
  using (
    exists (
      select 1 from medications m
      where m.id = medication_intake_logs.medication_id
        and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from medications m
      where m.id = medication_intake_logs.medication_id
        and m.user_id = auth.uid()
    )
  );

---------------------------------------------------------------------
-- Convenience RPC: insert_medication(...)
-- This RPC sets user_id = auth.uid() so clients don't need to pass user_id directly.
-- It returns the inserted medications row.
-- NOTE: For broader security control, consider creating this function as SECURITY DEFINER
-- and granting execute to 'authenticated' role; evaluate with your security policy.
---------------------------------------------------------------------
create or replace function insert_medication(
  p_entry_method text,
  p_medication_name text,
  p_medication_type text,
  p_dosage_value numeric,
  p_dosage_unit text,
  p_instructions text,
  p_frequency_type text,
  p_times_per_day integer,
  p_dose_times time[],
  p_repeat_days text[],
  p_start_date date,
  p_end_date date,
  p_timezone text,
  p_notification_type text[],
  p_pre_reminder_time integer,
  p_snooze_enabled boolean,
  p_snooze_interval integer,
  p_missed_dose_alert boolean,
  p_total_quantity integer,
  p_dose_consumption integer,
  p_refill_threshold integer,
  p_refill_reminder_enabled boolean,
  p_prescribed_by text,
  p_hospital_or_clinic text,
  p_prescription_notes text
) returns medications
language sql
as $$
  INSERT INTO medications (
    user_id,
    entry_method,
    medication_name,
    medication_type,
    dosage_value,
    dosage_unit,
    instructions,
    frequency_type,
    times_per_day,
    dose_times,
    repeat_days,
    start_date,
    end_date,
    timezone,
    notification_type,
    pre_reminder_time,
    snooze_enabled,
    snooze_interval,
    missed_dose_alert,
    total_quantity,
    dose_consumption,
    refill_threshold,
    refill_reminder_enabled,
    prescribed_by,
    hospital_or_clinic,
    prescription_notes,
    created_at,
    updated_at
  ) VALUES (
    auth.uid(),
    p_entry_method,
    p_medication_name,
    p_medication_type,
    p_dosage_value,
    p_dosage_unit,
    p_instructions,
    p_frequency_type,
    p_times_per_day,
    p_dose_times,
    p_repeat_days,
    p_start_date,
    p_end_date,
    p_timezone,
    p_notification_type,
    p_pre_reminder_time,
    p_snooze_enabled,
    p_snooze_interval,
    p_missed_dose_alert,
    p_total_quantity,
    p_dose_consumption,
    p_refill_threshold,
    p_refill_reminder_enabled,
    p_prescribed_by,
    p_hospital_or_clinic,
    p_prescription_notes,
    now(),
    now()
  )
  RETURNING *;
$$;

-- Optionally grant execute to authenticated users (uncomment if desired)
-- grant execute on function insert_medication(text,text,text,numeric,text,text,text,integer,time[],text[],date,date,text,text,integer,boolean,integer,boolean,integer,integer,integer,boolean,text,text,text) to authenticated;

---------------------------------------------------------------------
-- Notes / Next steps:
-- 1) Apply this migration in Supabase SQL editor.
-- 2) If you prefer clients to use direct inserts, ensure RLS policies + WITH CHECK allow inserts (above does).
-- 3) After deploying migration, update `database-schema.sql` (or your migration tooling) to include this file.
-- 4) Consider adding triggers to validate dose_times count matches times_per_day or maintain audit columns if needed.
---------------------------------------------------------------------
