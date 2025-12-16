-- Create profiles table with communication preferences
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  companion_name TEXT,
  communication_mode TEXT DEFAULT 'text' CHECK (communication_mode IN ('text', 'voice')),
  accent TEXT DEFAULT 'American' CHECK (accent IN ('American', 'British', 'Indian', 'Australian', 'Canadian')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Core fields
  title VARCHAR(100) NOT NULL,
  description TEXT,
  reminder_time TIMESTAMPTZ NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('important_dates', 'medications', 'appointments', 'other')),

  -- Recurrence settings
  repeat_frequency VARCHAR(20) DEFAULT 'none' CHECK (repeat_frequency IN ('none', 'daily', 'weekly', 'monthly', 'yearly', 'custom')),
  custom_repeat_config JSONB,
  ends_on TIMESTAMPTZ,

  -- Notification settings
  notification_types TEXT[] DEFAULT ARRAY['push']::TEXT[] CHECK (
    notification_types <@ ARRAY['push', 'voice', 'email', 'in_app']::TEXT[]
  ),
  notify_before_minutes INTEGER DEFAULT 0,

  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'snoozed', 'missed', 'cancelled')),
  completed_at TIMESTAMPTZ,

  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_reminder_time ON reminders(reminder_time);

-- Enable RLS
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own reminders" ON reminders
  FOR SELECT USING (auth.uid() = user_id AND is_deleted = FALSE);

CREATE POLICY "Users can insert own reminders" ON reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders" ON reminders
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();