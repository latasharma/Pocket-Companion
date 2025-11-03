-- =====================================================
-- Privacy and Safety Features for Connect
-- =====================================================
-- This script creates tables for user blocking, reporting,
-- privacy settings, and safety features

-- =====================================================
-- User Blocks Table
-- =====================================================
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason VARCHAR(100), -- Optional reason for blocking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- =====================================================
-- User Reports Table
-- =====================================================
CREATE TABLE IF NOT EXISTS user_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL, -- 'inappropriate_behavior', 'spam', 'harassment', 'fake_profile', 'other'
  description TEXT, -- Optional description of the issue
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  admin_notes TEXT, -- Admin notes for review
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Privacy Settings Table
-- =====================================================
CREATE TABLE IF NOT EXISTS user_privacy_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Profile Visibility
  profile_visibility VARCHAR(20) DEFAULT 'public', -- 'public', 'friends_only', 'hidden'
  show_interests BOOLEAN DEFAULT true,
  show_concerns BOOLEAN DEFAULT true,
  show_connection_type BOOLEAN DEFAULT true,
  show_location BOOLEAN DEFAULT true,
  
  -- Matching Preferences
  allow_matching BOOLEAN DEFAULT true,
  show_in_discovery BOOLEAN DEFAULT true,
  
  -- Communication
  allow_messages BOOLEAN DEFAULT true,
  allow_connection_requests BOOLEAN DEFAULT true,
  
  -- Location Privacy
  location_precision VARCHAR(20) DEFAULT 'city', -- 'exact', 'city', 'region', 'country', 'hidden'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- User Verification Table
-- =====================================================
CREATE TABLE IF NOT EXISTS user_verification (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Verification Status
  is_verified BOOLEAN DEFAULT false,
  verification_type VARCHAR(30), -- 'email', 'phone', 'identity', 'manual'
  verification_date TIMESTAMP WITH TIME ZONE,
  
  -- Trust Score (0-100)
  trust_score INTEGER DEFAULT 50,
  trust_factors JSONB DEFAULT '{}', -- Factors affecting trust score
  
  -- Safety Flags
  is_flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  flag_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Safety Guidelines Table
-- =====================================================
CREATE TABLE IF NOT EXISTS safety_guidelines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50), -- 'communication', 'meeting', 'privacy', 'reporting'
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Insert Default Safety Guidelines
-- =====================================================
INSERT INTO safety_guidelines (title, content, category, display_order) VALUES
('Safe Communication', 'Always be respectful and kind in your messages. Report any inappropriate behavior immediately.', 'communication', 1),
('Meeting Safely', 'When meeting someone in person, choose public places and let someone know where you''re going.', 'meeting', 2),
('Protect Your Privacy', 'Never share personal information like your address, phone number, or financial details.', 'privacy', 3),
('Report Concerns', 'If someone makes you uncomfortable, use the block or report features. We''re here to help.', 'reporting', 4),
('Trust Your Instincts', 'If something feels wrong, it probably is. Trust your gut and prioritize your safety.', 'communication', 5);

-- =====================================================
-- Row Level Security Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_guidelines ENABLE ROW LEVEL SECURITY;

-- User Blocks Policies
CREATE POLICY "Users can view their own blocks" ON user_blocks
  FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "Users can create their own blocks" ON user_blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks" ON user_blocks
  FOR DELETE USING (auth.uid() = blocker_id);

-- User Reports Policies
CREATE POLICY "Users can view their own reports" ON user_reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create reports" ON user_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Privacy Settings Policies
CREATE POLICY "Users can view their own privacy settings" ON user_privacy_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy settings" ON user_privacy_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own privacy settings" ON user_privacy_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Verification Policies
CREATE POLICY "Users can view their own verification" ON user_verification
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view other users' verification status" ON user_verification
  FOR SELECT USING (true); -- Allow viewing verification status for matching

-- Safety Guidelines Policies
CREATE POLICY "Everyone can view safety guidelines" ON safety_guidelines
  FOR SELECT USING (is_active = true);

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON user_reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_privacy_settings_user ON user_privacy_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_user ON user_verification(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_verified ON user_verification(is_verified);
CREATE INDEX IF NOT EXISTS idx_safety_guidelines_active ON safety_guidelines(is_active, display_order);
