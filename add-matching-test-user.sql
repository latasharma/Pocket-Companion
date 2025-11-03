-- Add a test user that shares interests with Mike's profile
-- This will demonstrate the matching algorithm working properly

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
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Alex',
  'Creative',
  'Pixel',
  true,
  ARRAY['AI', 'Mobile Apps', 'Art', 'Photography', 'Entrepreneurship'],
  ARRAY['career', 'creative'],
  'professional',
  'local',
  NOW()
);
