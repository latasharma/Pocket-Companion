-- =====================================================
-- Cleanup Unused Tables Script
-- =====================================================
-- This script removes tables that are not currently being used in the code

-- =====================================================
-- Drop Unused Tables
-- =====================================================

-- Drop connection_messages table (not used in code)
DROP TABLE IF EXISTS connection_messages CASCADE;

-- Drop user_verification table (not used in code)
DROP TABLE IF EXISTS user_verification CASCADE;

-- Drop safety_guidelines table (not used in code)
DROP TABLE IF EXISTS safety_guidelines CASCADE;

-- Drop interest_groups table (not used in code)
DROP TABLE IF EXISTS interest_groups CASCADE;

-- Drop group_memberships table (not used in code)
DROP TABLE IF EXISTS group_memberships CASCADE;

-- =====================================================
-- Verify Remaining Tables
-- =====================================================

-- List all remaining tables to verify cleanup
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'user_connections',
    'connection_notifications', 
    'user_blocks',
    'user_reports',
    'user_privacy_settings',
    'privacy_settings_history',
    'profiles'
  )
ORDER BY tablename;

-- =====================================================
-- Summary
-- =====================================================
SELECT 'Unused tables cleaned up successfully!' as status;
SELECT 'Remaining tables: user_connections, connection_notifications, user_blocks, user_reports, user_privacy_settings, privacy_settings_history, profiles' as active_tables;
