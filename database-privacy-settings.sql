-- =====================================================
-- Privacy Settings Database Schema
-- =====================================================
-- This script creates tables for user privacy settings and controls

-- =====================================================
-- User Privacy Settings Table
-- =====================================================
CREATE TABLE IF NOT EXISTS user_privacy_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Profile Visibility Controls
  profile_visibility VARCHAR(20) DEFAULT 'public', -- 'public', 'friends_only', 'private'
  show_online_status BOOLEAN DEFAULT true,
  show_interests_to_others BOOLEAN DEFAULT true,
  show_concerns_to_others BOOLEAN DEFAULT false,
  show_connection_count BOOLEAN DEFAULT true,
  show_join_date BOOLEAN DEFAULT true,
  
  -- Connection Controls
  allow_connection_requests BOOLEAN DEFAULT true,
  connection_request_filter VARCHAR(20) DEFAULT 'everyone', -- 'everyone', 'verified_only', 'friends_of_friends'
  allow_group_invitations BOOLEAN DEFAULT true,
  
  -- Location & Activity
  share_location VARCHAR(20) DEFAULT 'connections_only', -- 'never', 'connections_only', 'always'
  show_activity_status BOOLEAN DEFAULT true,
  
  -- Communication Controls
  allow_direct_messages BOOLEAN DEFAULT true,
  direct_message_filter VARCHAR(20) DEFAULT 'connections', -- 'everyone', 'connections', 'none'
  allow_message_requests BOOLEAN DEFAULT true,
  show_read_receipts BOOLEAN DEFAULT true,
  
  -- Data Sharing
  allow_profile_picture_download BOOLEAN DEFAULT false,
  show_last_seen BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one privacy setting per user
  UNIQUE(user_id)
);

-- =====================================================
-- Privacy Settings History (for audit trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS privacy_settings_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  setting_name VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id) -- Usually the same as user_id, but could be admin
);

-- =====================================================
-- Row Level Security Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_settings_history ENABLE ROW LEVEL SECURITY;

-- User Privacy Settings Policies
CREATE POLICY "Users can view their own privacy settings" ON user_privacy_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy settings" ON user_privacy_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own privacy settings" ON user_privacy_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Privacy Settings History Policies
CREATE POLICY "Users can view their own privacy history" ON privacy_settings_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert privacy history" ON privacy_settings_history
  FOR INSERT WITH CHECK (true); -- Allow system to log changes

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_privacy_settings_user ON user_privacy_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_privacy_settings_visibility ON user_privacy_settings(profile_visibility);
CREATE INDEX IF NOT EXISTS idx_user_privacy_settings_requests ON user_privacy_settings(allow_connection_requests);
CREATE INDEX IF NOT EXISTS idx_privacy_history_user ON privacy_settings_history(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_history_changed_at ON privacy_settings_history(changed_at);

-- =====================================================
-- Functions for Privacy Management
-- =====================================================

-- Function to get or create default privacy settings for a user
CREATE OR REPLACE FUNCTION get_or_create_privacy_settings(p_user_id UUID)
RETURNS user_privacy_settings AS $$
DECLARE
  settings_record user_privacy_settings;
BEGIN
  -- Try to get existing settings
  SELECT * INTO settings_record 
  FROM user_privacy_settings 
  WHERE user_id = p_user_id;

  -- If no settings exist, create default ones
  IF NOT FOUND THEN
    INSERT INTO user_privacy_settings (user_id)
    VALUES (p_user_id)
    RETURNING * INTO settings_record;
  END IF;

  RETURN settings_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update privacy settings with history tracking
CREATE OR REPLACE FUNCTION update_privacy_setting(
  p_user_id UUID,
  p_setting_name VARCHAR(50),
  p_new_value TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  old_value TEXT;
  new_value TEXT;
BEGIN
  -- Get the old value
  EXECUTE format('SELECT %I FROM user_privacy_settings WHERE user_id = $1', p_setting_name)
  INTO old_value
  USING p_user_id;

  -- Update the setting
  EXECUTE format('UPDATE user_privacy_settings SET %I = $2, updated_at = NOW() WHERE user_id = $1', p_setting_name)
  USING p_user_id, p_new_value;

  -- Log the change in history
  INSERT INTO privacy_settings_history (user_id, setting_name, old_value, new_value, changed_by)
  VALUES (p_user_id, p_setting_name, old_value, p_new_value, p_user_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user can view another user's profile
CREATE OR REPLACE FUNCTION can_view_profile(
  p_viewer_id UUID,
  p_target_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  target_privacy user_privacy_settings;
  are_connected BOOLEAN;
BEGIN
  -- Get target user's privacy settings
  SELECT * INTO target_privacy 
  FROM user_privacy_settings 
  WHERE user_id = p_target_user_id;

  -- If no privacy settings, default to public
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  -- Check profile visibility
  IF target_privacy.profile_visibility = 'public' THEN
    RETURN TRUE;
  ELSIF target_privacy.profile_visibility = 'private' THEN
    RETURN FALSE;
  ELSIF target_privacy.profile_visibility = 'friends_only' THEN
    -- Check if users are connected
    SELECT EXISTS(
      SELECT 1 FROM user_connections 
      WHERE ((requester_id = p_viewer_id AND requested_id = p_target_user_id) 
             OR (requester_id = p_target_user_id AND requested_id = p_viewer_id))
      AND status = 'accepted'
    ) INTO are_connected;
    
    RETURN are_connected;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user can send connection request
CREATE OR REPLACE FUNCTION can_send_connection_request(
  p_sender_id UUID,
  p_target_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  target_privacy user_privacy_settings;
  are_connected BOOLEAN;
BEGIN
  -- Get target user's privacy settings
  SELECT * INTO target_privacy 
  FROM user_privacy_settings 
  WHERE user_id = p_target_user_id;

  -- If no privacy settings, default to allowing requests
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  -- Check if connection requests are allowed
  IF NOT target_privacy.allow_connection_requests THEN
    RETURN FALSE;
  END IF;

  -- Check connection request filter
  IF target_privacy.connection_request_filter = 'everyone' THEN
    RETURN TRUE;
  ELSIF target_privacy.connection_request_filter = 'none' THEN
    RETURN FALSE;
  ELSIF target_privacy.connection_request_filter = 'verified_only' THEN
    -- Check if sender is verified (placeholder - implement verification check)
    RETURN TRUE; -- For now, assume all users are verified
  ELSIF target_privacy.connection_request_filter = 'friends_of_friends' THEN
    -- Check if sender is connected to any of target's connections
    -- This is a complex query - implement if needed
    RETURN TRUE; -- For now, allow all
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Test the setup
-- =====================================================
SELECT 'Privacy settings tables and functions created successfully!' as status;
