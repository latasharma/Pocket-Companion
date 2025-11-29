-- Setup Supabase Storage for Profile Images
-- Run this in your Supabase SQL editor

-- Create the storage bucket for profile images (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Profile images are publicly viewable" ON storage.objects;

-- Create storage policies for profile images
-- Allow authenticated users to upload to profile-images bucket
CREATE POLICY "Users can upload their own profile images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profile-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own profile images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profile-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own profile images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'profile-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Profile images are publicly viewable" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-images');

-- Add profile_image_url column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
