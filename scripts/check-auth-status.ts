import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkRecentRecords() {
    console.log('--- Checking Recent Payments ---');
    const { data: payments, error: pError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (pError) {
        console.error('Error fetching payments:', pError);
    } else {
        console.table(payments?.map(p => ({
            id: p.id,
            order_id: p.razorpay_order_id,
            status: p.status,
            created: p.created_at,
            amount: p.amount
        })));
    }

    console.log('\n--- Checking Recent Orders ---');
    const { data: orders, error: oError } = await supabase
        .from('orders')
        .select('id, order_number, payment_id, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (oError) {
        console.error('Error fetching orders:', oError);
    } else {
        console.table(orders);
    }
}

checkRecentRecords();
