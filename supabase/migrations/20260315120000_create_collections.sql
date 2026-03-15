-- Create collections table for marketing campaigns
CREATE TABLE IF NOT EXISTS public.collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create many-to-many relationship between collections and products
CREATE TABLE IF NOT EXISTS public.collection_products (
    collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (collection_id, product_id)
);

-- Add collection_id to banners for CMS-driven links
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_products ENABLE ROW LEVEL SECURITY;

-- Policies for collections
CREATE POLICY "Public read active collections"
    ON public.collections FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

CREATE POLICY "Admins can manage collections"
    ON public.collections FOR ALL
    TO authenticated
    USING (is_admin());

-- Policies for collection_products
CREATE POLICY "Public read collection products"
    ON public.collection_products FOR SELECT
    TO anon, authenticated
    USING (EXISTS (SELECT 1 FROM public.collections WHERE id = collection_id AND is_active = true));

CREATE POLICY "Admins can manage collection products"
    ON public.collection_products FOR ALL
    TO authenticated
    USING (is_admin());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_collections_slug ON public.collections(slug);
CREATE INDEX IF NOT EXISTS idx_collection_products_collection ON public.collection_products(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_products_product ON public.collection_products(product_id);
