import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
    try {
        const { data: syns, error: synsErr } = await supabase.from('search_synonyms').select('*').limit(1);
        console.log('search_synonyms table:', synsErr ? 'ERROR: ' + synsErr.message : 'OK');

        const { data: redirects, error: redErr } = await supabase.from('search_redirects').select('*').limit(1);
        console.log('search_redirects table:', redErr ? 'ERROR: ' + redErr.message : 'OK');

        const { data: searchTest, error: searchErr } = await supabase.rpc('search_products', {
            query_text: 'pants',
            filter_category_id: null,
            min_price: null,
            max_price: null,
            sort_by: 'relevance',
            limit_count: 5,
            offset_count: 0
        });
        console.log('search_products RPC:', searchErr ? 'ERROR: ' + searchErr.message : 'OK');
    } catch (e: any) {
        console.error('Test execution error:', e);
    }
}

run();
