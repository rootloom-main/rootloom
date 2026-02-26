-- Upgraded Search Function with Filtering, Sorting, and Pagination
-- Supports: Category Filter, Price Range, Sorting (Relevance, Price, Newest)

DROP FUNCTION IF EXISTS search_products(text, int);
DROP FUNCTION IF EXISTS search_products(text, uuid, decimal, decimal, text, int, int);

CREATE OR REPLACE FUNCTION search_products(
  query_text text,
  filter_category_id uuid DEFAULT NULL,
  min_price decimal DEFAULT NULL,
  max_price decimal DEFAULT NULL,
  sort_by text DEFAULT 'relevance',
  limit_count int DEFAULT 20,
  offset_count int DEFAULT 0
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
      c.name as category_name,
      (
        -- improved relevance calculation
        -- 1. Exact Name Match (1.0)
        -- 2. Starts With (0.8)
        -- 3. Word Similarity (pg_trgm)
        -- 4. Description Match (0.1)
        CASE 
          WHEN p.name ILIKE query_text THEN 1.0
          WHEN p.name ILIKE query_text || '%' THEN 0.8
          ELSE word_similarity(query_text, p.name)
        END 
        +
        (CASE WHEN c.name ILIKE '%' || query_text || '%' THEN 0.2 ELSE 0 END)
        +
        (CASE WHEN p.description ILIKE '%' || query_text || '%' THEN 0.1 ELSE 0 END)
      ) as relevance
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE
      -- Text Matching
      (
        query_text IS NULL OR query_text = '' OR
        p.name ILIKE '%' || query_text || '%' OR
        p.description ILIKE '%' || query_text || '%' OR
        c.name ILIKE '%' || query_text || '%' OR
        EXISTS (
            SELECT 1 FROM product_variants pv 
            WHERE pv.product_id = p.id 
            AND (pv.sku ILIKE '%' || query_text || '%' OR pv.color ILIKE '%' || query_text || '%')
        )
      )
      -- Category Filter
      AND (filter_category_id IS NULL OR p.category_id = filter_category_id)
      -- Price Filter
      AND (min_price IS NULL OR p.base_price >= min_price)
      AND (max_price IS NULL OR p.base_price <= max_price)
  ),
  total_rows AS (
    SELECT COUNT(*) as count FROM search_base WHERE relevance > 0.1
  )
  SELECT
    sb.id,
    sb.name,
    sb.slug,
    (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = sb.id ORDER BY pi.display_order LIMIT 1) as image_url,
    sb.base_price,
    sb.category_name,
    sb.relevance::float as similarity_score,
    COALESCE(AVG(r.rating), 0) as average_rating,
    COUNT(r.id) as review_count,
    (SELECT count FROM total_rows) as total_count
  FROM search_base sb
  LEFT JOIN reviews r ON sb.id = r.product_id
  WHERE sb.relevance > 0.1
  GROUP BY sb.id, sb.name, sb.slug, sb.base_price, sb.category_name, sb.relevance, sb.created_at
  ORDER BY
    CASE WHEN sort_by = 'price_asc' THEN sb.base_price END ASC,
    CASE WHEN sort_by = 'price_desc' THEN sb.base_price END DESC,
    CASE WHEN sort_by = 'newest' THEN sb.created_at END DESC,
    CASE WHEN sort_by = 'relevance' THEN sb.relevance END DESC,
    sb.relevance DESC -- Default fallback
  LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;
