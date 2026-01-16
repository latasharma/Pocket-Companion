-- Add last_interaction_at to profiles to track when user last chatted with PoCo
-- This enables proactive check-ins after 8 hours of inactivity

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for efficient querying of inactive users
CREATE INDEX IF NOT EXISTS idx_profiles_last_interaction 
  ON public.profiles(last_interaction_at);

COMMENT ON COLUMN public.profiles.last_interaction_at IS 
  'Timestamp of last interaction with AI companion - used for proactive check-ins';
