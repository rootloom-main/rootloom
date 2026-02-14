-- Drop existing function to recreate with new return type
DROP FUNCTION IF EXISTS search_products(text, int);

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
  similarity_score float,
  average_rating numeric,
  review_count bigint
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
        -- Calculate relevance score
        CASE WHEN p.name ILIKE query_text THEN 1.0
        WHEN p.name ILIKE query_text || '%' THEN 0.8
        ELSE similarity(p.name, query_text)
        END 
        +
        (CASE WHEN c.name ILIKE '%' || query_text || '%' THEN 0.3 ELSE 0 END)
        +
        (CASE WHEN p.description ILIKE '%' || query_text || '%' THEN 0.1 ELSE 0 END)
      ) as relevance
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE
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
    sr.relevance::float as similarity_score,
    COALESCE(AVG(r.rating), 0) as average_rating,
    COUNT(r.id) as review_count
  FROM search_results sr
  LEFT JOIN reviews r ON sr.id = r.product_id
  WHERE sr.relevance > 0.1
  GROUP BY sr.id, sr.name, sr.slug, sr.base_price, sr.category_name, sr.relevance
  ORDER BY sr.relevance DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
