
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), '.env.production') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentReturns() {
    const { data, error } = await supabase
        .from('returns')
        .select('id, order_id, status, request_type')
        .order('created_at', { ascending: false })
        .limit(5);
    
    if (error) {
        console.error('Error fetching returns:', error);
    } else {
        console.log('Recent Returns:', JSON.stringify(data, null, 2));
    }
}

async function run() {
    await checkRecentReturns();
}

run();
