import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
    try {
        console.log('Querying triggers...');
        // Let's run a query to select from pg_trigger where tgname = 'on_auth_user_created'
        const { data, error } = await supabase.rpc('inspect_triggers');
        if (error) {
            console.error('RPC Error:', error);
            
            // If RPC doesn't exist, we can create a temporary PostgreSQL query or just inspect it via SQL if we can.
            // Let's query information_schema or check trigger status by creating a RPC to query triggers.
        } else {
            console.log('Triggers found:', data);
        }
    } catch (e: any) {
        console.error('Execution error:', e);
    }
}

run();
