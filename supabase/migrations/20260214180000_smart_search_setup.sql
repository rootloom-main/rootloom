-- Enable Extensions for Fuzzy Search and Similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- =============================================
-- 1. INDEXES FOR PERFORMANCE
-- =============================================

-- GIN Index on Product Name and Description for Full Text Search
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_description_trgm ON products USING gin (description gin_trgm_ops);

-- Index on Category Name (joined query)
CREATE INDEX IF NOT EXISTS idx_categories_name_trgm ON categories USING gin (name gin_trgm_ops);

-- Index on Variant SKU and Color
CREATE INDEX IF NOT EXISTS idx_variants_sku_trgm ON product_variants USING gin (sku gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_variants_color_trgm ON product_variants USING gin (color gin_trgm_ops);


-- =============================================
-- 2. SEARCH FUNCTION (RPC)
-- =============================================

CREATE OR REPLACE FUNCTION search_products(
  query_text text,
  limit_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  image_url text,
  base_price decimal,
  category_name text,
  similarity_score float
) AS $$
BEGIN
  RETURN QUERY
  WITH search_results AS (
    SELECT
      p.id,
      p.name,
      p.slug,
      p.base_price,
      c.name as category_name,
      (
        -- Calculate relevance score based on matches
        -- Exact Name Match (Highest priority)
        CASE WHEN p.name ILIKE query_text THEN 1.0
        -- Name starts with query
        WHEN p.name ILIKE query_text || '%' THEN 0.8
        -- Word similarity in name
        ELSE similarity(p.name, query_text)
        END 
        +
        -- Boost if category matches
        (CASE WHEN c.name ILIKE '%' || query_text || '%' THEN 0.3 ELSE 0 END)
        +
        -- Boost if description matches
        (CASE WHEN p.description ILIKE '%' || query_text || '%' THEN 0.1 ELSE 0 END)
      ) as relevance
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE
      -- Filter conditions
      p.name ILIKE '%' || query_text || '%' OR
      p.description ILIKE '%' || query_text || '%' OR
      c.name ILIKE '%' || query_text || '%' OR
      EXISTS (
        SELECT 1 FROM product_variants pv 
        WHERE pv.product_id = p.id 
        AND (pv.sku ILIKE '%' || query_text || '%' OR pv.color ILIKE '%' || query_text || '%')
      )
  )
  SELECT
    sr.id,
    sr.name,
    sr.slug,
    (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = sr.id ORDER BY pi.display_order LIMIT 1) as image_url,
    sr.base_price,
    sr.category_name,
    sr.relevance::float as similarity_score
  FROM search_results sr
  WHERE sr.relevance > 0.1 -- Filter out low relevance results
  ORDER BY sr.relevance DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
