-- Create storage bucket for collections
INSERT INTO storage.buckets (id, name, public)
VALUES ('collections', 'collections', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view collection images
CREATE POLICY "Public Access Collections"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'collections' );

-- Policy: Admins can upload collection images
CREATE POLICY "Admin Upload Collections"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'collections' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin')
  )
);

-- Policy: Admins can update collection images
CREATE POLICY "Admin Update Collections"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'collections' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin')
  )
);

-- Policy: Admins can delete collection images
CREATE POLICY "Admin Delete Collections"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'collections' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin')
  )
);
