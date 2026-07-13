ALTER TABLE public.returns
ADD COLUMN IF NOT EXISTS image_path TEXT;

UPDATE public.returns
SET image_path = split_part(image_url, '/returns/', 2)
WHERE image_path IS NULL
  AND image_url LIKE '%/storage/v1/object/public/returns/%';

UPDATE storage.buckets
SET public = false
WHERE id = 'returns';

DROP POLICY IF EXISTS "Allow public view" ON storage.objects;

DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
CREATE POLICY "Returns evidence authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'returns'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Returns evidence owner read" ON storage.objects;
CREATE POLICY "Returns evidence owner read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'returns'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin()
  )
);
