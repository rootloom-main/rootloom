-- Upgrade collections table with enterprise CMS features
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'manual' CHECK (type IN ('manual', 'automated')),
ADD COLUMN IF NOT EXISTS rules JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS seo_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS marketing_settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS badge_label TEXT,
ADD COLUMN IF NOT EXISTS sort_by TEXT DEFAULT 'newest';

-- Add comment for rules structure guidance
COMMENT ON COLUMN public.collections.rules IS 'Array of objects: { field: "category" | "price" | "tag", operator: "equals" | "greater_than" | "less_than", value: any }';

-- Update RLS for new columns (usually automatic, but good to check)
-- Public read should include new metadata
DROP POLICY IF EXISTS "Public read active collections" ON public.collections;
CREATE POLICY "Public read active collections"
    ON public.collections FOR SELECT
    TO anon, authenticated
    USING (is_active = true AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW()));

-- Ensure display_order in collection_products is respected
ALTER TABLE public.collection_products 
RENAME COLUMN display_order TO manual_display_order;
