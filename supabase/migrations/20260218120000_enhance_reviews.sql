-- Add title and images to reviews table
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS images text[] DEFAULT ARRAY[]::text[];

-- Create storage bucket for review images if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-images', 'review-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload review images
CREATE POLICY "Authenticated users can upload review images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'review-images' AND auth.uid() = owner);

-- Policy to allow anyone to view review images
CREATE POLICY "Anyone can view review images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'review-images');

-- Policy to allow users to delete their own review images
CREATE POLICY "Users can delete their own review images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'review-images' AND auth.uid() = owner);
