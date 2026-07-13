DROP POLICY IF EXISTS "Returns evidence owner read" ON storage.objects;
DROP POLICY IF EXISTS "Returns evidence authenticated upload" ON storage.objects;

CREATE POLICY "Allow authenticated upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'returns');

CREATE POLICY "Allow public view" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'returns');

UPDATE storage.buckets
SET public = true
WHERE id = 'returns';

ALTER TABLE public.returns
DROP COLUMN IF EXISTS image_path;
