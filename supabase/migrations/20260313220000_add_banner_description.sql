-- Add description support to banners
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS description TEXT;

-- (Optional) Update existing hero banners with some default text if needed
UPDATE public.banners SET description = title WHERE position = 'hero' AND description IS NULL;
