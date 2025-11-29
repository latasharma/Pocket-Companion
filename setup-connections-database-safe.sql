-- =====================================================
-- Safe Setup Script for User Connections
-- =====================================================
-- This script handles existing policies gracefully

-- Create the user_connections table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS user_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, requested_id)
);

-- Enable RLS (safe to run multiple times)
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Users can view their own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can create connection requests" ON user_connections;
DROP POLICY IF EXISTS "Users can update their own connection requests" ON user_connections;

-- Create RLS policies
CREATE POLICY "Users can view their own connections" ON user_connections
  FOR SELECT USING (
    auth.uid() = requester_id OR 
    auth.uid() = requested_id
  );

CREATE POLICY "Users can create connection requests" ON user_connections
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their own connection requests" ON user_connections
  FOR UPDATE USING (
    auth.uid() = requester_id OR 
    auth.uid() = requested_id
  );

-- Create or replace the function
CREATE OR REPLACE FUNCTION create_connection_request(
  p_requester_id UUID,
  p_requested_id UUID
) RETURNS UUID AS $$
DECLARE
  connection_id UUID;
BEGIN
  -- Check if connection already exists
  IF EXISTS (
    SELECT 1 FROM user_connections 
    WHERE (requester_id = p_requester_id AND requested_id = p_requested_id)
    OR (requester_id = p_requested_id AND requested_id = p_requester_id)
  ) THEN
    RAISE EXCEPTION 'Connection already exists between these users';
  END IF;

  -- Create the connection request
  INSERT INTO user_connections (requester_id, requested_id, status)
  VALUES (p_requester_id, p_requested_id, 'pending')
  RETURNING id INTO connection_id;

  RETURN connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_user_connections_requester ON user_connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_requested ON user_connections(requested_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_status ON user_connections(status);

-- Test the setup
SELECT 'User connections table and policies set up successfully!' as status;
