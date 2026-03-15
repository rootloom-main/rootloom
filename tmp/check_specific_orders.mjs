
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

async function checkSpecificOrders(ids) {
    const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, refund_status, refund_amount')
        .in('id', ids);
    
    if (error) {
        console.error('Error fetching orders:', error);
    } else {
        console.log('Specific Orders Refund Info:', JSON.stringify(data, null, 2));
    }
}

async function run() {
    await checkSpecificOrders([
        'bffe0c73-112c-48d2-8981-364f8073eccb',
        'e51f5a03-b3af-4de6-a5de-886b4bd3a253'
    ]);
}

run();
