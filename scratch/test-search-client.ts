import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function run() {
    try {
        console.log('Querying search_products using client anon key...');
        const { data: searchTest, error: searchErr } = await supabase.rpc('search_products', {
            query_text: 'pants',
            filter_category_id: null,
            min_price: null,
            max_price: null,
            sort_by: 'relevance',
            limit_count: 5,
            offset_count: 0
        });
        
        if (searchErr) {
            console.error('CLIENT SEARCH ERROR:', searchErr.message, searchErr.code, searchErr.details);
        } else {
            console.log('CLIENT SEARCH OK! Results count:', searchTest?.length);
        }

        console.log('Querying search_redirects using client anon key...');
        const { data: redirects, error: redErr } = await supabase.from('search_redirects').select('*').limit(1);
        if (redErr) {
            console.error('CLIENT REDIRECTS ERROR:', redErr.message, redErr.code, redErr.details);
        } else {
            console.log('CLIENT REDIRECTS OK! Results:', redirects);
        }
    } catch (e: any) {
        console.error('Test execution error:', e);
    }
}

run();
