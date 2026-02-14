-- Create banners table
CREATE TABLE IF NOT EXISTS banners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    link TEXT,
    active BOOLEAN DEFAULT false,
    position TEXT DEFAULT 'hero', -- hero, promo_top, promo_bottom
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read active banners"
    ON banners FOR SELECT
    TO anon, authenticated
    USING (active = true);

CREATE POLICY "Admins can manage banners"
    ON banners FOR ALL
    TO authenticated
    USING (is_admin());

-- Storage bucket for banners (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can upload banner images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'banners' AND is_admin());

CREATE POLICY "Public can view banner images"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'banners');
