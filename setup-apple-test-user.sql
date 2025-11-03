-- =====================================================
-- Setup Apple Test User Profile
-- =====================================================
-- This script grants Premium access to lata1.sharma@gmail
-- for Apple App Store review testing
-- 
-- Run this in Supabase SQL Editor after resetting password
-- =====================================================

-- First, find the user ID (replace with actual ID from auth.users)
-- You can find it by running: SELECT id, email FROM auth.users WHERE email = 'lata1.sharma@gmail';

-- Update profile with Premium access and Connect setup
-- Replace 'USER_ID_HERE' with the actual user ID from the query above

UPDATE profiles
SET
  first_name = 'Apple',
  last_name = 'Reviewer',
  companion_name = 'Pixel',
  subscription_tier = 'premium',
  subscription_status = 'active',
  subscription_start_date = NOW(),
  subscription_end_date = NOW() + INTERVAL '30 days',
  trial_end_date = NOW() + INTERVAL '30 days',
  connect_onboarding_completed = true,
  connect_interests = ARRAY['Technology', 'Mobile Apps', 'AI', 'Health', 'Productivity'],
  connect_concerns = ARRAY['career', 'health', 'learning'],
  connect_type = 'professional',
  connect_location = 'national',
  updated_at = NOW()
WHERE id = (SELECT id FROM auth.users WHERE email = 'lata1.sharma@gmail')
RETURNING id, first_name, last_name, subscription_tier, subscription_status, subscription_end_date;

-- Verify the update
SELECT 
  u.email,
  p.first_name,
  p.last_name,
  p.subscription_tier,
  p.subscription_status,
  p.subscription_end_date,
  p.connect_onboarding_completed
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email = 'lata1.sharma@gmail';

-- Check if user has Connect access using the function
SELECT has_connect_access((SELECT id FROM auth.users WHERE email = 'lata1.sharma@gmail'));

