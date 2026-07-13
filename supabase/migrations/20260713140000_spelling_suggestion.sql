-- SQL Migration: Add spelling suggestion RPC for search results empty state

CREATE OR REPLACE FUNCTION public.get_search_spelling_suggestion(query_text text)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT name 
    FROM public.products 
    WHERE deleted_at IS NULL AND status = 'active'
      AND similarity(name, query_text) > 0.2
    ORDER BY similarity(name, query_text) DESC, sales_count DESC
    LIMIT 1;
$$;
