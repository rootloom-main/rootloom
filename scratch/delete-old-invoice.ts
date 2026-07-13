import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
    console.log('Fetching order...');
    const { data: order } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', 'ORD1783932135328688')
        .single() as any;

    if (!order) {
        console.error('Order not found!');
        return;
    }

    console.log('Deleting cached invoice snapshot for order ID:', order.id);
    const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('order_id', order.id);

    if (error) {
        console.error('Failed to delete invoice:', error);
    } else {
        console.log('Successfully cleared cached invoice snapshot.');
    }
}

run();
