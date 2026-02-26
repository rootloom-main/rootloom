import { createClient } from '@/lib/supabase/server';
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
        });
    }

    const supabase = await createClient();

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

        return NextResponse.json(responsePayload);
    } catch (err) {
        console.error('Search API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
