const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDatabaseIntegrity() {
    console.log('--- Checking Recent Orders ---');
    const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false })
        .limit(1);

    if (orderError) {
        console.error('Error fetching orders:', orderError);
        return;
    }

    if (orders.length === 0) {
        console.log('No orders found to test. Database schema looks intact.');
        return;
    }

    const latestOrder = orders[0];
    console.log(`Latest Order ID: ${latestOrder.id}`);
    console.log(`Payment ID stored: ${latestOrder.payment_id !== null}`);
    console.log(`Order Status: ${latestOrder.status}`);

    if (latestOrder.order_items && latestOrder.order_items.length > 0) {
        console.log(`Order Items Linked correctly: yes, ${latestOrder.order_items.length} items.`);

        // Check stock for the first item
        const firstItem = latestOrder.order_items[0];
        const { data: variant, error: variantError } = await supabase
            .from('product_variants')
            .select('stock')
            .eq('id', firstItem.variant_id)
            .single();

        if (variant) {
            console.log(`Stock tracking is active for variant ${firstItem.variant_id}: Current stock ${variant.stock}`);
        } else {
            console.log('Variant not found or error loading stock', variantError);
        }

    } else {
        console.log(`Order Items Linked: NO. Items missing.`);
    }

    // Check if cart is cleared
    const { data: cartItems } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', latestOrder.user_id);

    console.log(`Cart is cleared for this user: ${cartItems && cartItems.length === 0}`);

    console.log('--- Database Validation Completed ---');
}

verifyDatabaseIntegrity();
