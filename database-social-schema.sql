-- =====================================================
-- POCO Social Connections Feature - Database Schema
-- =====================================================
-- This schema supports the social connection feature
-- that allows users to connect based on shared interests
-- =====================================================

-- =====================================================
-- 1. INTEREST CATEGORIES & TYPES
-- =====================================================

-- Predefined interest categories
CREATE TABLE interest_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50), -- For UI display
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Predefined interest values within each category
CREATE TABLE interest_values (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES interest_categories(id) ON DELETE CASCADE,
    value VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, value)
);

-- =====================================================
-- 2. USER INTERESTS & PREFERENCES
-- =====================================================

-- User's interests and hobbies
CREATE TABLE user_interests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES interest_categories(id) ON DELETE CASCADE,
    interest_value_id UUID REFERENCES interest_values(id) ON DELETE CASCADE,
    importance_level INTEGER DEFAULT 1 CHECK (importance_level BETWEEN 1 AND 5), -- 1=low, 5=high
    is_public BOOLEAN DEFAULT true, -- Can others see this interest?
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, interest_value_id)
);

-- User's life concerns and goals
CREATE TABLE user_concerns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    concern_type VARCHAR(50) NOT NULL, -- 'career', 'health', 'relationships', 'personal_growth', etc.
    concern_description TEXT,
    privacy_level VARCHAR(20) DEFAULT 'friends' CHECK (privacy_level IN ('private', 'friends', 'public')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User's social preferences
CREATE TABLE user_social_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    connection_type VARCHAR(20) DEFAULT 'friendship' CHECK (connection_type IN ('friendship', 'professional', 'support', 'hobby')),
    age_range_min INTEGER DEFAULT 18,
    age_range_max INTEGER DEFAULT 99,
    location_radius INTEGER DEFAULT 50, -- in miles/km
    max_connections INTEGER DEFAULT 100,
    allow_connection_requests BOOLEAN DEFAULT true,
    show_online_status BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CONNECTIONS & RELATIONSHIPS
-- =====================================================

-- User connections (friendships, professional, etc.)
CREATE TABLE user_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    connected_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    connection_type VARCHAR(20) DEFAULT 'friendship' CHECK (connection_type IN ('friendship', 'professional', 'support', 'hobby')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
    initiated_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    connection_strength INTEGER DEFAULT 1 CHECK (connection_strength BETWEEN 1 AND 5), -- Based on shared interests
    last_interaction TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, connected_user_id),
    CHECK (user_id != connected_user_id)
);

-- Connection messages (human-to-human chat)
CREATE TABLE connection_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    connection_id UUID REFERENCES user_connections(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message_content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'image', 'system')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. INTEREST-BASED GROUPS
-- =====================================================

-- Interest-based communities/groups
CREATE TABLE interest_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES interest_categories(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT true,
    max_members INTEGER DEFAULT 1000,
    current_members INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group memberships
CREATE TABLE group_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES interest_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Group messages/discussions
CREATE TABLE group_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES interest_groups(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message_content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'image', 'system')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. PRIVACY & SAFETY
-- =====================================================

-- User privacy settings
CREATE TABLE user_privacy_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    profile_visibility VARCHAR(20) DEFAULT 'friends' CHECK (profile_visibility IN ('private', 'friends', 'public')),
    show_interests BOOLEAN DEFAULT true,
    show_concerns BOOLEAN DEFAULT false,
    show_online_status BOOLEAN DEFAULT true,
    allow_connection_requests BOOLEAN DEFAULT true,
    allow_group_invites BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blocked users
CREATE TABLE user_blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reason VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, blocked_user_id),
    CHECK (user_id != blocked_user_id)
);

-- Reported users/content
CREATE TABLE user_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL, -- 'harassment', 'spam', 'inappropriate', etc.
    report_description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================

-- User interests indexes
CREATE INDEX idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX idx_user_interests_category ON user_interests(category_id);
CREATE INDEX idx_user_interests_public ON user_interests(user_id, is_public) WHERE is_public = true;

-- Connections indexes
CREATE INDEX idx_user_connections_user_id ON user_connections(user_id);
CREATE INDEX idx_user_connections_connected_user ON user_connections(connected_user_id);
CREATE INDEX idx_user_connections_status ON user_connections(status);
CREATE INDEX idx_user_connections_type ON user_connections(connection_type);

-- Messages indexes
CREATE INDEX idx_connection_messages_connection ON connection_messages(connection_id);
CREATE INDEX idx_connection_messages_sender ON connection_messages(sender_id);
CREATE INDEX idx_connection_messages_created ON connection_messages(created_at);

-- Group indexes
CREATE INDEX idx_group_memberships_group ON group_memberships(group_id);
CREATE INDEX idx_group_memberships_user ON group_memberships(user_id);
CREATE INDEX idx_group_messages_group ON group_messages(group_id);

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_concerns ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_social_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE interest_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- User interests policies
CREATE POLICY "Users can view their own interests" ON user_interests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public interests of others" ON user_interests
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can manage their own interests" ON user_interests
    FOR ALL USING (auth.uid() = user_id);

-- User connections policies
CREATE POLICY "Users can view their own connections" ON user_connections
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = connected_user_id);

CREATE POLICY "Users can create connection requests" ON user_connections
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = connected_user_id);

CREATE POLICY "Users can update their own connections" ON user_connections
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = connected_user_id);

-- Connection messages policies
CREATE POLICY "Users can view messages in their connections" ON connection_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_connections 
            WHERE id = connection_id 
            AND (user_id = auth.uid() OR connected_user_id = auth.uid())
        )
    );

CREATE POLICY "Users can send messages in their connections" ON connection_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM user_connections 
            WHERE id = connection_id 
            AND (user_id = auth.uid() OR connected_user_id = auth.uid())
            AND status = 'accepted'
        )
    );

-- =====================================================
-- 8. SAMPLE DATA (OPTIONAL)
-- =====================================================

-- Insert some common interest categories
INSERT INTO interest_categories (name, description, icon) VALUES
('Hobbies', 'Recreational activities and pastimes', '🎨'),
('Sports', 'Physical activities and sports', '⚽'),
('Music', 'Musical genres, instruments, and artists', '🎵'),
('Books', 'Reading preferences and genres', '📚'),
('Movies', 'Film preferences and genres', '🎬'),
('Travel', 'Travel destinations and experiences', '✈️'),
('Food', 'Culinary preferences and cooking', '🍕'),
('Technology', 'Tech interests and programming', '💻'),
('Health', 'Fitness, wellness, and health topics', '💪'),
('Career', 'Professional interests and goals', '💼');

-- Insert some common interest values
INSERT INTO interest_values (category_id, value, description) VALUES
-- Hobbies
((SELECT id FROM interest_categories WHERE name = 'Hobbies'), 'Photography', 'Taking and editing photos'),
((SELECT id FROM interest_categories WHERE name = 'Hobbies'), 'Gardening', 'Growing plants and flowers'),
((SELECT id FROM interest_categories WHERE name = 'Hobbies'), 'Painting', 'Creating visual art'),
((SELECT id FROM interest_categories WHERE name = 'Hobbies'), 'Crafting', 'Making handmade items'),

-- Sports
((SELECT id FROM interest_categories WHERE name = 'Sports'), 'Running', 'Jogging and marathon training'),
((SELECT id FROM interest_categories WHERE name = 'Sports'), 'Yoga', 'Mind-body practice'),
((SELECT id FROM interest_categories WHERE name = 'Sports'), 'Basketball', 'Team sport'),
((SELECT id FROM interest_categories WHERE name = 'Sports'), 'Swimming', 'Water-based exercise'),

-- Music
((SELECT id FROM interest_categories WHERE name = 'Music'), 'Rock', 'Rock and roll music'),
((SELECT id FROM interest_categories WHERE name = 'Music'), 'Jazz', 'Jazz and blues music'),
((SELECT id FROM interest_categories WHERE name = 'Music'), 'Classical', 'Classical and orchestral music'),
((SELECT id FROM interest_categories WHERE name = 'Music'), 'Electronic', 'Electronic and dance music');

-- =====================================================
-- END OF SCHEMA
-- =====================================================
