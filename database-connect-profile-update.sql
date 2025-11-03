-- =====================================================
-- Add Connect feature columns to profiles table
-- =====================================================

-- Add Connect onboarding and preference columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS connect_onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS connect_interests TEXT[], -- Array of selected interests
ADD COLUMN IF NOT EXISTS connect_concerns TEXT[], -- Array of selected concerns
ADD COLUMN IF NOT EXISTS connect_type VARCHAR(20) DEFAULT 'friendship', -- Connection type preference
ADD COLUMN IF NOT EXISTS connect_location VARCHAR(20) DEFAULT 'local'; -- Location preference

-- Add comments for documentation
COMMENT ON COLUMN profiles.connect_onboarding_completed IS 'Whether user has completed Connect onboarding';
COMMENT ON COLUMN profiles.connect_interests IS 'Array of user selected interests for matching';
COMMENT ON COLUMN profiles.connect_concerns IS 'Array of user life goals/concerns';
COMMENT ON COLUMN profiles.connect_type IS 'Preferred connection type: friendship, professional, support, hobby';
COMMENT ON COLUMN profiles.connect_location IS 'Location preference: local, regional, national, global';
