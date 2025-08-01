-- First, create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create user_medications table for storing user medication data
CREATE TABLE IF NOT EXISTS user_medications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  time TEXT DEFAULT '8:00 AM',
  frequency TEXT DEFAULT 'daily',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_medications_user_id ON user_medications(user_id);

-- Enable Row Level Security
ALTER TABLE user_medications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own medications" ON user_medications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own medications" ON user_medications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own medications" ON user_medications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own medications" ON user_medications
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_user_medications_updated_at ON user_medications;
CREATE TRIGGER update_user_medications_updated_at 
  BEFORE UPDATE ON user_medications 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
