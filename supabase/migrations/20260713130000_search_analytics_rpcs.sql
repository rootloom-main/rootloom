-- SQL Migration: Add search analytics RPC functions for Admin Dashboard

-- 1. Top Searches RPC
CREATE OR REPLACE FUNCTION public.get_top_searches(limit_count integer DEFAULT 10)
RETURNS TABLE (
    query_text text,
    count bigint,
    results_count integer,
    last_searched timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT 
        s.query_text, 
        COUNT(*)::bigint as count, 
        MAX(s.results_count)::integer as results_count, 
        MAX(s.created_at) as last_searched
    FROM public.search_analytics s
    GROUP BY s.query_text
    ORDER BY count DESC
    LIMIT limit_count;
$$;

-- 2. No-Result Searches RPC
CREATE OR REPLACE FUNCTION public.get_no_result_searches(limit_count integer DEFAULT 10)
RETURNS TABLE (
    query_text text,
    count bigint,
    last_searched timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT 
        s.query_text, 
        COUNT(*)::bigint as count, 
        MAX(s.created_at) as last_searched
    FROM public.search_analytics s
    WHERE s.results_count = 0
    GROUP BY s.query_text
    ORDER BY count DESC
    LIMIT limit_count;
$$;

-- 3. Top Clicked & Purchased Products RPC
CREATE OR REPLACE FUNCTION public.get_top_clicked_products(limit_count integer DEFAULT 10)
RETURNS TABLE (
    query_text text,
    product_name text,
    product_slug text,
    click_count bigint,
    purchase_count bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT 
        sc.query_text,
        p.name as product_name,
        p.slug as product_slug,
        COUNT(sc.id)::bigint as click_count,
        COUNT(CASE WHEN sc.is_purchase = true THEN 1 END)::bigint as purchase_count
    FROM public.search_clicks sc
    JOIN public.products p ON sc.product_id = p.id
    GROUP BY sc.query_text, p.name, p.slug
    ORDER BY click_count DESC, purchase_count DESC
    LIMIT limit_count;
$$;

-- 4. Search Analytics Summary RPC
CREATE OR REPLACE FUNCTION public.get_search_analytics_summary()
RETURNS TABLE (
    unique_queries bigint,
    total_searches bigint,
    total_no_results bigint,
    total_clicks bigint,
    total_purchases bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_unique_queries bigint;
    v_total_searches bigint;
    v_total_no_results bigint;
    v_total_clicks bigint;
    v_total_purchases bigint;
BEGIN
    SELECT 
        COUNT(DISTINCT s.query_text)::bigint,
        COUNT(*)::bigint,
        COUNT(CASE WHEN s.results_count = 0 THEN 1 END)::bigint
    INTO v_unique_queries, v_total_searches, v_total_no_results
    FROM public.search_analytics s;

    SELECT 
        COUNT(*)::bigint,
        COUNT(CASE WHEN sc.is_purchase = true THEN 1 END)::bigint
    INTO v_total_clicks, v_total_purchases
    FROM public.search_clicks sc;

    RETURN QUERY SELECT 
        COALESCE(v_unique_queries, 0::bigint),
        COALESCE(v_total_searches, 0::bigint),
        COALESCE(v_total_no_results, 0::bigint),
        COALESCE(v_total_clicks, 0::bigint),
        COALESCE(v_total_purchases, 0::bigint);
END;
$$;
