
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

async function checkOrderSchema() {
    const { data, error } = await supabase.from('orders').select('*').limit(1);
    if (error) {
        console.error('Error fetching order:', error);
    } else if (data && data.length > 0) {
        console.log('Order columns:', Object.keys(data[0]));
    }
}

async function checkReturnsSchema() {
    const { data, error } = await supabase.from('returns').select('*').limit(1);
    if (error) {
        console.error('Error fetching return:', error);
    } else if (data && data.length > 0) {
        console.log('Return columns:', Object.keys(data[0]));
    }
}

async function run() {
    await checkOrderSchema();
    await checkReturnsSchema();
}

run();
