-- =====================================================
-- User Connections System for Connect Feature
-- =====================================================
-- This script creates tables for managing user connections,
-- connection requests, and messaging functionality

-- =====================================================
-- User Connections Table
-- =====================================================
CREATE TABLE IF NOT EXISTS user_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'blocked'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, requested_id)
);

-- =====================================================
-- Connection Messages Table
-- =====================================================
CREATE TABLE IF NOT EXISTS connection_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES user_connections(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'system'
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Connection Notifications Table
-- =====================================================
CREATE TABLE IF NOT EXISTS connection_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES user_connections(id) ON DELETE CASCADE,
  notification_type VARCHAR(30) NOT NULL, -- 'connection_request', 'connection_accepted', 'new_message'
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Row Level Security Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_notifications ENABLE ROW LEVEL SECURITY;

-- User Connections Policies
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

-- Connection Messages Policies
CREATE POLICY "Users can view messages in their connections" ON connection_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_connections 
      WHERE user_connections.id = connection_messages.connection_id 
      AND (user_connections.requester_id = auth.uid() OR user_connections.requested_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their connections" ON connection_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM user_connections 
      WHERE user_connections.id = connection_messages.connection_id 
      AND user_connections.status = 'accepted'
      AND (user_connections.requester_id = auth.uid() OR user_connections.requested_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages" ON connection_messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Connection Notifications Policies
CREATE POLICY "Users can view their own notifications" ON connection_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON connection_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_connections_requester ON user_connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_requested ON user_connections(requested_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_status ON user_connections(status);
CREATE INDEX IF NOT EXISTS idx_connection_messages_connection ON connection_messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_connection_messages_sender ON connection_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_connection_messages_created ON connection_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_connection_notifications_user ON connection_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_connection_notifications_read ON connection_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_connection_notifications_created ON connection_notifications(created_at);

-- =====================================================
-- Functions for Common Operations
-- =====================================================

-- Function to create a connection request
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

  -- Create notification for the requested user
  INSERT INTO connection_notifications (
    user_id, 
    connection_id, 
    notification_type, 
    title, 
    message
  ) VALUES (
    p_requested_id,
    connection_id,
    'connection_request',
    'New Connection Request',
    'Someone wants to connect with you!'
  );

  RETURN connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept a connection request
CREATE OR REPLACE FUNCTION accept_connection_request(
  p_connection_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  connection_record RECORD;
BEGIN
  -- Get the connection record
  SELECT * INTO connection_record 
  FROM user_connections 
  WHERE id = p_connection_id AND requested_id = p_user_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Connection request not found or already processed';
  END IF;

  -- Update the connection status
  UPDATE user_connections 
  SET status = 'accepted', updated_at = NOW()
  WHERE id = p_connection_id;

  -- Create notification for the requester
  INSERT INTO connection_notifications (
    user_id, 
    connection_id, 
    notification_type, 
    title, 
    message
  ) VALUES (
    connection_record.requester_id,
    p_connection_id,
    'connection_accepted',
    'Connection Accepted',
    'Your connection request was accepted!'
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
