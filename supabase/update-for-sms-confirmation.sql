-- Update schema to support SMS-based medication confirmation
-- For critical medications only

-- Add phone to profiles if not exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_phone 
  ON public.profiles(phone);

COMMENT ON COLUMN public.profiles.phone IS 
  'User phone number for SMS-based critical medication confirmations';

-- Add SMS tracking to dose_events
ALTER TABLE public.dose_events
  ADD COLUMN IF NOT EXISTS confirmation_sms_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_dose_events_sms_sent 
  ON public.dose_events(confirmation_sms_sent_at);

COMMENT ON COLUMN public.dose_events.confirmation_sms_sent_at IS 
  'When SMS was sent asking user to confirm medication (critical meds only)';
