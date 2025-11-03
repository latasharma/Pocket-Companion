-- Test trial expiry by setting trial_end_date to yesterday
-- This will make the client-side check immediately deny access

-- Replace with your actual user ID
UPDATE profiles 
SET trial_end_date = NOW() - INTERVAL '1 day'
WHERE id = '2601b427-5950-44d6-935d-88a32441d3d1';

-- Verify the change
SELECT 
  id,
  subscription_tier,
  subscription_status,
  trial_end_date,
  NOW() as current_time,
  (trial_end_date < NOW()) as is_expired
FROM profiles 
WHERE id = '2601b427-5950-44d6-935d-88a32441d3d1';

-- To restore trial (set it back to 7 days from now):
-- UPDATE profiles 
-- SET trial_end_date = NOW() + INTERVAL '7 days'
-- WHERE id = '2601b427-5950-44d6-935d-88a32441d3d1';
