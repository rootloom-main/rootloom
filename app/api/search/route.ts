import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
        return NextResponse.json({ results: [] });
    }

    const supabase = await createClient();

    try {
        const { data: results, error } = await supabase.rpc('search_products', {
            query_text: query.trim(),
            limit_count: 20
        });

        if (error) {
            console.error('Search RPC Error:', error);
            return NextResponse.json({ error: 'Failed to fetch search results' }, { status: 500 });
        }

        return NextResponse.json({ results });
    } catch (err) {
        console.error('Search API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
