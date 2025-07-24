-- Create profiles table with communication preferences
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  companion_name TEXT,
  communication_mode TEXT DEFAULT 'text' CHECK (communication_mode IN ('text', 'voice', 'hybrid')),
  accent TEXT DEFAULT 'American' CHECK (accent IN ('American', 'British', 'Indian', 'Australian', 'Canadian')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
); 