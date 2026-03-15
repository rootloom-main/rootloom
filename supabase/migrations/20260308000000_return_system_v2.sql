-- Add image_url column to returns table
ALTER TABLE returns ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create the "returns" storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('returns', 'returns', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Allow authenticated users to upload to returns bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Allow authenticated upload'
    ) THEN
        CREATE POLICY "Allow authenticated upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'returns');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Allow public view'
    ) THEN
        CREATE POLICY "Allow public view" ON storage.objects FOR SELECT TO public USING (bucket_id = 'returns');
    END IF;
END $$;
