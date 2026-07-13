import { createSSRClient as createClient } from '@/lib/utils/auth';
import { NextResponse } from 'next/server';
import { getCache, setCache } from '@/lib/redis';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const categoryId = searchParams.get('category'); // UUID
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : null;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : null;
    const sortBy = searchParams.get('sort') || 'relevance';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Strict input validation to prevent DoS and malformed RPC parameters
    if (isNaN(page) || page < 1 || page > 1000) {
        return NextResponse.json({ error: 'Invalid page parameter' }, { status: 400 });
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
        return NextResponse.json({ error: 'Limit must be between 1 and 100' }, { status: 400 });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (categoryId && !uuidRegex.test(categoryId)) {
        return NextResponse.json({ error: 'Invalid category format' }, { status: 400 });
    }

    if (minPrice !== null && (isNaN(minPrice) || minPrice < 0)) {
        return NextResponse.json({ error: 'Invalid minPrice parameter' }, { status: 400 });
    }
    if (maxPrice !== null && (isNaN(maxPrice) || maxPrice < 0)) {
        return NextResponse.json({ error: 'Invalid maxPrice parameter' }, { status: 400 });
    }

    const validSorts = ['relevance', 'price_asc', 'price_desc', 'newest'];
    if (!validSorts.includes(sortBy)) {
        return NextResponse.json({ error: 'Invalid sort parameter' }, { status: 400 });
    }

    const offset = (page - 1) * limit;

    // Enterprise Phase 2: Deterministic Redis Caching
    const cacheKeyParams = JSON.stringify({ q: query, cat: categoryId, min: minPrice, max: maxPrice, sort: sortBy, p: page, l: limit });
    const cacheKey = `search:${cacheKeyParams}`;

    // Check Cache
    const cachedResults = await getCache<any>(cacheKey);
    if (cachedResults) {
        return NextResponse.json({
            results: cachedResults.results,
            pagination: cachedResults.pagination,
            cached: true
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
            },
        });
    }

    const supabase = await createClient();

    // Check for search redirects first (case-insensitive check)
    try {
        const { data: redirectRow } = await supabase
            .from('search_redirects')
            .select('redirect_url')
            .eq('query_text', query.trim().toLowerCase())
            .eq('is_active', true)
            .maybeSingle();

        if (redirectRow) {
            return NextResponse.json({ redirect: redirectRow.redirect_url });
        }
    } catch (err) {
        console.error('Redirect check error:', err);
    }

    try {
        const { data: results, error } = await supabase.rpc('search_products', {
            query_text: query.trim(),
            filter_category_id: categoryId,
            min_price: minPrice,
            max_price: maxPrice,
            sort_by: sortBy,
            limit_count: limit,
            offset_count: offset
        } as any) as any;

        if (error) {
            console.error('Search RPC Error:', error);
            return NextResponse.json({ error: 'Failed to fetch search results' }, { status: 500 });
        }

        const responsePayload = {
            results,
            pagination: {
                page,
                limit,
                total: results?.[0]?.total_count || 0
            }
        };

        // Cache for 15 minutes (900 seconds)
        if (results) {
            await setCache(cacheKey, responsePayload, 900);
        }

        return NextResponse.json(responsePayload, {
            headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
            },
        });
    } catch (err) {
        console.error('Search API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
