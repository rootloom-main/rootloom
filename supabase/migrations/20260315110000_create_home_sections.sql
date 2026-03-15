-- Create home_sections table for dynamic page building
CREATE TABLE IF NOT EXISTS public.home_sections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL, -- GRID, BANNER, HERO, CATEGORY_GRID, BRAND_STORY, NEWSLETTER, TRUST
    title TEXT,
    subtitle TEXT,
    config JSONB DEFAULT '{}'::jsonb, -- Store collection_slug, limit, etc.
    display_order INT DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.home_sections ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read active home sections"
    ON public.home_sections FOR SELECT
    TO anon, authenticated
    USING (active = true);

CREATE POLICY "Admins can manage home sections"
    ON public.home_sections FOR ALL
    TO authenticated
    USING (is_admin());

-- Seed initial sections to replicate current homepage
INSERT INTO public.home_sections (type, title, display_order, active)
VALUES 
    ('HERO', 'Hero Slider', 10, true),
    ('PROMO', 'Top Promo', 15, true),
    ('CATEGORY_GRID', 'Shop by Category', 20, true),
    ('NEW_ARRIVALS', 'New Arrivals', 30, true),
    ('BEST_SELLERS', 'Best Sellers', 40, true),
    ('FEATURED', 'Featured Artifacts', 50, true),
    ('BRAND_STORY', 'Brand Story', 60, true),
    ('ALL_PRODUCTS', 'Explore All', 70, true),
    ('PROMO_BOTTOM', 'Bottom Promo', 75, true),
    ('NEWSLETTER', 'Newsletter', 80, true),
    ('TRUST', 'Trust Indicators', 90, true)
ON CONFLICT DO NOTHING;
