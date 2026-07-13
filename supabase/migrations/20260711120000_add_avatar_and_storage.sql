-- Add avatar_url column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for avatars bucket
-- 1. Anyone can view avatar images
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'avatars' );

-- 2. Authenticated users can upload their own avatar
DROP POLICY IF EXISTS "Authenticated Users Upload Avatar" ON storage.objects;
CREATE POLICY "Authenticated Users Upload Avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Authenticated users can update their own avatar
DROP POLICY IF EXISTS "Authenticated Users Update Avatar" ON storage.objects;
CREATE POLICY "Authenticated Users Update Avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Authenticated users can delete their own avatar
DROP POLICY IF EXISTS "Authenticated Users Delete Avatar" ON storage.objects;
CREATE POLICY "Authenticated Users Delete Avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
