-- =====================================================
-- Check and Create Apple Test User
-- =====================================================
-- Run each section separately to diagnose the issue
-- =====================================================

-- STEP 1: Check if user exists
SELECT id, email, created_at, confirmed_at
FROM auth.users 
WHERE email = 'lata1.sharma@gmail';

-- If the above returns NO ROWS, the user doesn't exist!
-- Continue to STEP 2 to create the user

-- =====================================================
-- STEP 2: Create the user if it doesn't exist
-- =====================================================
-- Note: You need to use the Supabase Admin API or Dashboard to create users
-- SQL INSERT into auth.users directly is not recommended

-- Instead, use this approach:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Invite User" or "Add User" button
-- 3. Enter email: lata1.sharma@gmail
-- 4. Set password: Lata4321$
-- 5. Check "Auto Confirm User" (skip email verification)
-- 6. Click Create

-- OR use the Admin API approach (see below)

-- =====================================================
-- STEP 3: After user is created, verify it exists
-- =====================================================
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.confirmed_at,
  p.first_name,
  p.last_name,
  p.subscription_tier
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email = 'lata1.sharma@gmail';

-- =====================================================
-- STEP 4: If user exists, set up the profile
-- =====================================================
-- Replace USER_ID with the actual UUID from STEP 3
INSERT INTO profiles (
  id, 
  first_name, 
  last_name, 
  companion_name,
  subscription_tier,
  subscription_status,
  subscription_start_date,
  subscription_end_date,
  created_at,
  updated_at
)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'lata1.sharma@gmail'),
  'Apple',
  'Reviewer',
  'Pixel',
  'free',
  'active',
  NOW(),
  NOW() + INTERVAL '30 days',
  NOW(),
  NOW()
)
ON CONFLICT (id) 
DO UPDATE SET
  first_name = 'Apple',
  last_name = 'Reviewer',
  companion_name = 'Pixel',
  updated_at = NOW();

-- =====================================================
-- STEP 5: Verify the complete setup
-- =====================================================
SELECT 
  u.email,
  u.confirmed_at,
  p.first_name,
  p.last_name,
  p.companion_name,
  p.subscription_tier,
  p.subscription_status
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email = 'lata1.sharma@gmail';

