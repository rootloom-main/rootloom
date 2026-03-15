
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

async function syncRefunds() {
    console.log('Fetching processed returns...');
    const { data: returns, error: retError } = await supabase
        .from('returns')
        .select(`
            id,
            order_id,
            status,
            item:order_items(price)
        `)
        .eq('status', 'refund_processed');
    
    if (retError) {
        console.error('Error fetching returns:', retError);
        return;
    }

    console.log(`Found ${returns.length} processed returns. Syncing to orders...`);

    for (const ret of returns) {
        const amount = ret.item?.price || 0;
        console.log(`Syncing Return ${ret.id} (Order ${ret.order_id}) with amount ${amount}`);

        // Get current order status
        const { data: order } = await supabase
            .from('orders')
            .select('refund_status, refund_amount')
            .eq('id', ret.order_id)
            .single();
        
        if (order && order.refund_status === 'none') {
            const { error: updateError } = await supabase
                .from('orders')
                .update({
                    refund_status: 'processed',
                    refund_amount: amount,
                    updated_at: new Date().toISOString()
                })
                .eq('id', ret.order_id);
            
            if (updateError) {
                console.error(`Failed to update order ${ret.order_id}:`, updateError);
            } else {
                console.log(`Successfully updated order ${ret.order_id}`);
            }
        } else {
            console.log(`Order ${ret.order_id} already has refund status: ${order?.refund_status}`);
        }
    }
}

async function run() {
    await syncRefunds();
    console.log('Sync complete.');
}

run();
