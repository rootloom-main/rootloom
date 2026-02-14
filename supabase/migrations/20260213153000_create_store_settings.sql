-- Create store_settings table
CREATE TABLE IF NOT EXISTS store_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read settings"
    ON store_settings FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Admins can manage settings"
    ON store_settings FOR ALL
    TO authenticated
    USING (is_admin());

-- Insert default SEO settings
INSERT INTO store_settings (key, value) VALUES
    ('seo_title', 'Root & Loom - Handcrafted Excellence'),
    ('seo_description', 'Discover authentication Indian handicrafts and artisanal products.'),
    ('seo_keywords', 'handicrafts, india, artisanal, handmade')
ON CONFLICT (key) DO NOTHING;
