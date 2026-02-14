-- Create static pages table
CREATE TABLE IF NOT EXISTS pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT, -- HTML or Markdown
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Admins can manage pages
CREATE POLICY "Admins can manage pages"
    ON pages FOR ALL
    TO authenticated
    USING (is_admin());

-- Public can read published pages
CREATE POLICY "Public can read published pages"
    ON pages FOR SELECT
    TO anon, authenticated
    USING (is_published = true);

-- Seed initial pages
INSERT INTO pages (slug, title, content, is_published)
VALUES 
    ('privacy-policy', 'Privacy Policy', '<h1>Privacy Policy</h1><p>Coming soon...</p>', true),
    ('terms-of-service', 'Terms of Service', '<h1>Terms of Service</h1><p>Coming soon...</p>', true),
    ('return-policy', 'Return Policy', '<h1>Return Policy</h1><p>Coming soon...</p>', true)
ON CONFLICT (slug) DO NOTHING;
