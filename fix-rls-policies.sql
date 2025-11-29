-- =====================================================
-- Fix RLS Policies for Connect Feature
-- =====================================================
-- This script updates the Row Level Security policies
-- to allow users to read other profiles for the Connect feature

-- First, let's see what policies currently exist
-- (This is just for reference - you can run this in Supabase SQL Editor)

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read other profiles for Connect" ON profiles;

-- Create new policies that allow Connect functionality

-- 1. Users can view their own profile
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- 2. Users can update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 3. Users can insert their own profile
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. NEW: Users can read other profiles for Connect feature
-- This allows users to see other profiles that have completed Connect onboarding
CREATE POLICY "Users can read Connect profiles" ON profiles
  FOR SELECT USING (
    connect_onboarding_completed = true
  );

-- 5. NEW: Users can read basic profile info for matching
-- This allows reading profiles for the matching algorithm
CREATE POLICY "Users can read profiles for matching" ON profiles
  FOR SELECT USING (
    connect_onboarding_completed = true
  );

-- =====================================================
-- Alternative: If you want to be more restrictive,
-- you can use this policy instead of the above two:
-- =====================================================

-- DROP POLICY IF EXISTS "Users can read Connect profiles" ON profiles;
-- DROP POLICY IF EXISTS "Users can read profiles for matching" ON profiles;

-- CREATE POLICY "Users can read other Connect profiles" ON profiles
--   FOR SELECT USING (
--     auth.uid() != id AND 
--     connect_onboarding_completed = true
--   );

-- =====================================================
-- Test the policies
-- =====================================================

-- After running this script, test with:
-- SELECT id, first_name, connect_onboarding_completed 
-- FROM profiles 
-- WHERE connect_onboarding_completed = true;

-- You should see the test users if the policies are working correctly.
