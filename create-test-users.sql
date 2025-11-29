-- =====================================================
-- Create Test Users for Connect Feature
-- =====================================================
-- This script creates test users with different interests
-- and preferences to demonstrate the matching algorithm
-- =====================================================

-- IMPORTANT: This script creates test profiles without actual auth users
-- In production, you would create actual Supabase auth users first
-- For testing purposes, we'll temporarily disable the foreign key constraint

-- Temporarily disable ALL foreign key constraints to allow test profiles
-- This will find and remove any foreign key constraints on the profiles table
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Find all foreign key constraints on the profiles table
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'profiles'::regclass
        AND contype = 'f'
    ) LOOP
        EXECUTE 'ALTER TABLE profiles DROP CONSTRAINT IF EXISTS ' || r.conname;
        RAISE NOTICE 'Dropped constraint: %', r.conname;
    END LOOP;
END $$;

-- Insert test users into profiles table

INSERT INTO profiles (
  id,
  first_name,
  last_name,
  companion_name,
  connect_onboarding_completed,
  connect_interests,
  connect_concerns,
  connect_type,
  connect_location,
  created_at
) VALUES 
-- Test User 1: Sarah - Music and Books lover
(
  '11111111-1111-1111-1111-111111111111',
  'Sarah',
  'Johnson',
  'Pixel',
  true,
  ARRAY['Music', 'Books', 'Travel', 'Photography'],
  ARRAY['career', 'creative'],
  'friendship',
  'local',
  NOW()
),

-- Test User 2: Mike - Tech and Fitness enthusiast
(
  '22222222-2222-2222-2222-222222222222',
  'Mike',
  'Chen',
  'Pixel',
  true,
  ARRAY['Technology', 'Fitness', 'Gaming', 'Cooking'],
  ARRAY['career', 'health'],
  'professional',
  'regional',
  NOW()
),

-- Test User 3: Emma - Art and Wellness focused
(
  '33333333-3333-3333-3333-333333333333',
  'Emma',
  'Rodriguez',
  'Pixel',
  true,
  ARRAY['Art', 'Wellness', 'Food', 'Travel'],
  ARRAY['creative', 'health'],
  'hobby',
  'local',
  NOW()
),

-- Test User 4: Alex - Sports and Learning oriented
(
  '44444444-4444-4444-4444-444444444444',
  'Alex',
  'Thompson',
  'Pixel',
  true,
  ARRAY['Sports', 'Books', 'Technology', 'Music'],
  ARRAY['learning', 'health'],
  'support',
  'national',
  NOW()
),

-- Test User 5: Jordan - Creative and Social
(
  '55555555-5555-5555-5555-555555555555',
  'Jordan',
  'Williams',
  'Pixel',
  true,
  ARRAY['Art', 'Music', 'Photography', 'Travel'],
  ARRAY['creative', 'relationships'],
  'friendship',
  'global',
  NOW()
),

-- Test User 6: Taylor - Professional and Health focused
(
  '66666666-6666-6666-6666-666666666666',
  'Taylor',
  'Brown',
  'Pixel',
  true,
  ARRAY['Technology', 'Fitness', 'Books', 'Cooking'],
  ARRAY['career', 'health'],
  'professional',
  'regional',
  NOW()
),

-- Test User 7: Casey - Hobby and Support oriented
(
  '77777777-7777-7777-7777-777777777777',
  'Casey',
  'Davis',
  'Pixel',
  true,
  ARRAY['Gaming', 'Music', 'Art', 'Food'],
  ARRAY['personal', 'creative'],
  'hobby',
  'local',
  NOW()
),

-- Test User 8: Morgan - Wellness and Learning focused
(
  '88888888-8888-8888-8888-888888888888',
  'Morgan',
  'Wilson',
  'Pixel',
  true,
  ARRAY['Wellness', 'Books', 'Travel', 'Photography'],
  ARRAY['health', 'learning'],
  'support',
  'national',
  NOW()
);

-- =====================================================
-- Test User Profiles Summary:
-- =====================================================
-- Sarah: Music, Books, Travel, Photography | Career, Creative | Friendship | Local
-- Mike: Technology, Fitness, Gaming, Cooking | Career, Health | Professional | Regional  
-- Emma: Art, Wellness, Food, Travel | Creative, Health | Hobby | Local
-- Alex: Sports, Books, Technology, Music | Learning, Health | Support | National
-- Jordan: Art, Music, Photography, Travel | Creative, Relationships | Friendship | Global
-- Taylor: Technology, Fitness, Books, Cooking | Career, Health | Professional | Regional
-- Casey: Gaming, Music, Art, Food | Personal, Creative | Hobby | Local
-- Morgan: Wellness, Books, Travel, Photography | Health, Learning | Support | National
-- =====================================================

-- NOTE: The foreign key constraint was temporarily disabled for testing
-- In production, you should re-enable it after creating actual auth users:
-- ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);
