import { createSSRClient as createClient } from '@/lib/utils/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { query, productId, isPurchase } = await request.json();
        if (!query || !productId) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const supabaseAdmin = (await createAdminClient()) as any;
        const { error } = await supabaseAdmin.from('search_clicks').insert({
            query_text: query.trim().toLowerCase(),
            product_id: productId,
            user_id: user?.id || null,
            is_purchase: !!isPurchase
        });

        if (error) {
            console.error('Error logging search click/purchase:', error);
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Error in search click tracking API:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
