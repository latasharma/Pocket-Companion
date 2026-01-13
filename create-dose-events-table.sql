-- Creates per-dose tracking needed for escalation to caregivers.
-- Run this against your Supabase database before enabling the edge function.

create table if not exists public.dose_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  medication_id uuid references public.medications(id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null default 'pending', -- pending | taken | skipped
  confirmed_at timestamptz,
  retry_1_sent_at timestamptz,
  retry_2_sent_at timestamptz,
  caregiver_sms_sent_at timestamptz,
  caregiver_email_sent_at timestamptz,
  caregiver_call_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists dose_events_pending_idx
  on public.dose_events (status, scheduled_at);

comment on table public.dose_events is 'Per-dose events to power caregiver escalation for critical medications.';
comment on column public.dose_events.status is 'pending | taken | skipped';
