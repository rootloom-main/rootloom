-- Migration: Enterprise Search Engine Redesign

-- Enable trigram extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add view_count to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- 1. Create search_synonyms table
CREATE TABLE IF NOT EXISTS public.search_synonyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_term TEXT UNIQUE NOT NULL,
    synonyms TEXT[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create search_redirects table
CREATE TABLE IF NOT EXISTS public.search_redirects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text TEXT UNIQUE NOT NULL,
    redirect_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create search_analytics table
CREATE TABLE IF NOT EXISTS public.search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text TEXT NOT NULL,
    results_count INTEGER NOT NULL DEFAULT 0,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create search_clicks table
CREATE TABLE IF NOT EXISTS public.search_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text TEXT NOT NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID,
    is_purchase BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create search_configs table
CREATE TABLE IF NOT EXISTS public.search_configs (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for search tables
CREATE INDEX IF NOT EXISTS idx_search_synonyms_source ON public.search_synonyms(source_term);
CREATE INDEX IF NOT EXISTS idx_search_redirects_query ON public.search_redirects(query_text) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON public.search_analytics(query_text);
CREATE INDEX IF NOT EXISTS idx_search_clicks_query ON public.search_clicks(query_text);
CREATE INDEX IF NOT EXISTS idx_search_clicks_product ON public.search_clicks(product_id);

-- GIN index on products metadata for fast JSONB querying
CREATE INDEX IF NOT EXISTS idx_products_metadata_gin ON public.products USING GIN (metadata);

-- Enable RLS
ALTER TABLE public.search_synonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_configs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public select synonyms" ON public.search_synonyms;
DROP POLICY IF EXISTS "Admin manage synonyms" ON public.search_synonyms;
DROP POLICY IF EXISTS "Public select redirects" ON public.search_redirects;
DROP POLICY IF EXISTS "Admin manage redirects" ON public.search_redirects;
DROP POLICY IF EXISTS "Public insert analytics" ON public.search_analytics;
DROP POLICY IF EXISTS "Admin manage analytics" ON public.search_analytics;
DROP POLICY IF EXISTS "Public insert clicks" ON public.search_clicks;
DROP POLICY IF EXISTS "Admin manage clicks" ON public.search_clicks;
DROP POLICY IF EXISTS "Public select configs" ON public.search_configs;
DROP POLICY IF EXISTS "Admin manage configs" ON public.search_configs;

-- Helper to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  );
END;
$$;

-- RLS Policies
CREATE POLICY "Public select synonyms" ON public.search_synonyms FOR SELECT USING (true);
CREATE POLICY "Admin manage synonyms" ON public.search_synonyms FOR ALL USING (public.is_admin());

CREATE POLICY "Public select redirects" ON public.search_redirects FOR SELECT USING (true);
CREATE POLICY "Admin manage redirects" ON public.search_redirects FOR ALL USING (public.is_admin());

CREATE POLICY "Public insert analytics" ON public.search_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin manage analytics" ON public.search_analytics FOR ALL USING (public.is_admin());

CREATE POLICY "Public insert clicks" ON public.search_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin manage clicks" ON public.search_clicks FOR ALL USING (public.is_admin());

CREATE POLICY "Public select configs" ON public.search_configs FOR SELECT USING (true);
CREATE POLICY "Admin manage configs" ON public.search_configs FOR ALL USING (public.is_admin());

-- View counter function
CREATE OR REPLACE FUNCTION public.increment_product_views(product_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.products
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = product_id;
END;
$$;

-- Synonym group lookup helper
CREATE OR REPLACE FUNCTION public.get_synonyms_for_term(term text)
RETURNS text[]
LANGUAGE sql
STABLE
AS $$
  SELECT synonyms FROM public.search_synonyms 
  WHERE LOWER(source_term) = LOWER(term) 
     OR LOWER(term) = ANY(
       SELECT LOWER(s) FROM unnest(synonyms) s
     )
  LIMIT 1;
$$;

-- Drop old search functions
DROP FUNCTION IF EXISTS search_products(text, uuid, decimal, decimal, text, int, int);

-- Fully Redesigned Search Function
CREATE OR REPLACE FUNCTION search_products(
  query_text text,
  filter_category_id uuid DEFAULT NULL,
  min_price decimal DEFAULT NULL,
  max_price decimal DEFAULT NULL,
  sort_by text DEFAULT 'relevance',
  limit_count int DEFAULT 20,
  offset_count int DEFAULT 0,
  filter_brand text DEFAULT NULL,
  filter_size text DEFAULT NULL,
  filter_color text DEFAULT NULL,
  filter_material text DEFAULT NULL,
  filter_fit text DEFAULT NULL,
  filter_availability boolean DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  image_url text,
  base_price decimal,
  category_name text,
  similarity_score float,
  average_rating numeric,
  review_count bigint,
  total_stock bigint,
  total_count bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH search_base AS (
    SELECT
      p.id,
      p.name,
      p.slug,
      p.base_price,
      p.created_at,
      p.category_id,
      p.sales_count,
      p.view_count,
      c.name as category_name,
      (
        -- Ranking score logic
        -- 1. Exact Name match (weight: 5.0)
        (CASE WHEN query_text IS NOT NULL AND query_text <> '' AND p.name ILIKE query_text THEN 5.0 
              WHEN query_text IS NOT NULL AND query_text <> '' AND p.name ILIKE query_text || '%' THEN 2.0 
              ELSE 0.0 END)
        +
        -- 2. Exact SKU match (weight: 4.5)
        (CASE WHEN query_text IS NOT NULL AND query_text <> '' AND EXISTS (
            SELECT 1 FROM product_variants pv 
            WHERE pv.product_id = p.id AND pv.sku ILIKE query_text
         ) THEN 4.5 ELSE 0.0 END)
        +
        -- 3. Tag / Keyword match (weight: 3.0)
        (CASE WHEN query_text IS NOT NULL AND query_text <> '' AND (
            (p.metadata ? 'tags' AND p.metadata->'tags' ? query_text) OR 
            (p.metadata ? 'keywords' AND p.metadata->'keywords' ? query_text)
         ) THEN 3.0 ELSE 0.0 END)
        +
        -- 4. Category match (weight: 2.0)
        (CASE WHEN query_text IS NOT NULL AND query_text <> '' AND c.name ILIKE query_text THEN 2.0 ELSE 0.0 END)
        +
        -- 5. Collection match (weight: 1.5)
        (CASE WHEN query_text IS NOT NULL AND query_text <> '' AND EXISTS (
            SELECT 1 FROM collection_products cp 
            JOIN collections col ON cp.collection_id = col.id 
            WHERE cp.product_id = p.id AND col.name ILIKE query_text
         ) THEN 1.5 ELSE 0.0 END)
        +
        -- 6. Fuzzy Name match (weight: 1.5)
        (CASE WHEN query_text IS NOT NULL AND query_text <> '' THEN COALESCE(word_similarity(query_text, p.name), 0) * 1.5 ELSE 1.0 END)
        +
        -- 7. Sales count boost (max: 1.0)
        LEAST(COALESCE(p.sales_count, 0)::float / 1000.0, 1.0)
        +
        -- 8. View count boost (max: 0.5)
        LEAST(COALESCE(p.view_count, 0)::float / 5000.0, 0.5)
        +
        -- 9. In Stock boost (weight: 0.5)
        (CASE WHEN EXISTS (
            SELECT 1 FROM product_variants pv 
            WHERE pv.product_id = p.id AND pv.stock > 0
         ) THEN 0.5 ELSE 0.0 END)
        +
        -- 10. Recency boost (weight: 0.2)
        (CASE WHEN p.created_at > NOW() - INTERVAL '30 days' THEN 0.2 ELSE 0.0 END)
      ) as relevance,
      (SELECT SUM(pv.stock) FROM product_variants pv WHERE pv.product_id = p.id) as stock_sum
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE
      p.deleted_at IS NULL
      AND p.status = 'active'
      -- Dynamic Tokenized & Synonym Matching
      AND (
        query_text IS NULL OR query_text = '' OR
        NOT EXISTS (
          SELECT 1 
          FROM unnest(string_to_array(trim(regexp_replace(query_text, '\s+', ' ', 'g')), ' ')) AS original_word
          WHERE NOT EXISTS (
            SELECT 1 
            FROM unnest(array_cat(ARRAY[original_word], COALESCE(public.get_synonyms_for_term(original_word), ARRAY[]::text[]))) AS matched_term
            WHERE (
              p.name ILIKE '%' || matched_term || '%' OR
              p.description ILIKE '%' || matched_term || '%' OR
              c.name ILIKE '%' || matched_term || '%' OR
              p.metadata->>'fabric' ILIKE '%' || matched_term || '%' OR
              p.metadata->>'material' ILIKE '%' || matched_term || '%' OR
              p.metadata->>'fit' ILIKE '%' || matched_term || '%' OR
              p.metadata->>'season' ILIKE '%' || matched_term || '%' OR
              p.metadata->>'occasion' ILIKE '%' || matched_term || '%' OR
              p.metadata->>'pattern' ILIKE '%' || matched_term || '%' OR
              p.metadata->>'gender' ILIKE '%' || matched_term || '%' OR
              p.metadata->>'brand' ILIKE '%' || matched_term || '%' OR
              word_similarity(matched_term, p.name) > 0.4 OR
              EXISTS (
                  SELECT 1 FROM product_variants pv 
                  WHERE pv.product_id = p.id 
                  AND (pv.sku ILIKE '%' || matched_term || '%' OR pv.color ILIKE '%' || matched_term || '%' OR pv.size ILIKE '%' || matched_term || '%')
              )
            )
          )
        )
      )
      -- Category Filter
      AND (filter_category_id IS NULL OR p.category_id = filter_category_id)
      -- Price Filters
      AND (min_price IS NULL OR p.base_price >= min_price)
      AND (max_price IS NULL OR p.base_price <= max_price)
      -- Advanced Filters
      AND (filter_brand IS NULL OR LOWER(p.metadata->>'brand') = LOWER(filter_brand))
      AND (filter_material IS NULL OR LOWER(p.metadata->>'material') = LOWER(filter_material))
      AND (filter_fit IS NULL OR LOWER(p.metadata->>'fit') = LOWER(filter_fit))
      AND (filter_size IS NULL OR EXISTS (
            SELECT 1 FROM product_variants pv 
            WHERE pv.product_id = p.id AND LOWER(pv.size) = LOWER(filter_size)
      ))
      AND (filter_color IS NULL OR EXISTS (
            SELECT 1 FROM product_variants pv 
            WHERE pv.product_id = p.id AND LOWER(pv.color) = LOWER(filter_color)
      ))
  ),
  filtered_base AS (
    SELECT * FROM search_base
    WHERE relevance > 0.1
      AND (filter_availability IS NULL OR (filter_availability = true AND stock_sum > 0) OR (filter_availability = false AND COALESCE(stock_sum, 0) = 0))
  ),
  total_rows AS (
    SELECT COUNT(*) as count FROM filtered_base
  )
  SELECT
    fb.id,
    fb.name,
    fb.slug,
    (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = fb.id ORDER BY pi.display_order LIMIT 1) as image_url,
    fb.base_price,
    fb.category_name,
    fb.relevance::float as similarity_score,
    COALESCE(AVG(r.rating), 0) as average_rating,
    COUNT(r.id) as review_count,
    COALESCE(fb.stock_sum, 0) as total_stock,
    (SELECT count FROM total_rows) as total_count
  FROM filtered_base fb
  LEFT JOIN reviews r ON fb.id = r.product_id
  GROUP BY fb.id, fb.name, fb.slug, fb.base_price, fb.category_name, fb.relevance, fb.created_at, fb.sales_count, fb.view_count, fb.stock_sum
  ORDER BY
    CASE WHEN sort_by = 'price_asc' THEN fb.base_price END ASC,
    CASE WHEN sort_by = 'price_desc' THEN fb.base_price END DESC,
    CASE WHEN sort_by = 'newest' THEN fb.created_at END DESC,
    CASE WHEN sort_by = 'popularity' THEN fb.sales_count END DESC,
    CASE WHEN sort_by = 'relevance' THEN fb.relevance END DESC,
    fb.relevance DESC -- Default fallback
  LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;
