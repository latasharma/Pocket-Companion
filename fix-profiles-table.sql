-- Fix profiles table by adding missing columns
-- Run this in your Supabase SQL Editor

-- Add communication_mode column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS communication_mode TEXT DEFAULT 'text' CHECK (communication_mode IN ('text', 'voice'));

-- Add accent column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS accent TEXT DEFAULT 'American' CHECK (accent IN ('American', 'British', 'Indian', 'Australian', 'Canadian'));

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position; 