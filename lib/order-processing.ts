import { SupabaseClient } from '@supabase/supabase-js';
import { sendOrderConfirmationEmail } from '@/lib/email';
// import { sendInventoryAlertEmail } from '@/lib/email-alerts'; // Cyclic dependency risk if not careful, better to keep dynamic import

export async function processOrderCreation({
    supabase,
    userId,
    paymentId,
    amount, // Total amount paid
    cartItems,
    addressId,
    discountAmount,
    couponCode,
    shippingCost,
    subtotal,
    userEmail,
    userName,
}: {
    supabase: SupabaseClient;
    userId: string;
    paymentId: string;
    amount: number;
    cartItems: any[];
    addressId: string;
    discountAmount: number;
    couponCode: string | null;
    shippingCost: number;
    subtotal: number;
    userEmail: string;
    userName: string;
}) {
    const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // 1. Create Order Atomically via RPC
    const { data: result, error: rpcError } = await supabase.rpc('create_complete_order', {
        p_user_id: userId,
        p_order_number: orderNumber,
        p_payment_id: paymentId,
        p_subtotal: subtotal,
        p_shipping_cost: shippingCost,
        p_total: amount,
        p_discount_amount: discountAmount || 0,
        p_coupon_code: couponCode,
        p_shipping_address_id: addressId,
        p_items: cartItems.map((item: any) => ({
            product_id: item.product_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
            price: item.price
        }))
    } as any);

    if (rpcError) throw rpcError;

    // Re-fetch order to return full object if needed, or construct it
    const order = {
        id: result.id,
        order_number: result.order_number,
        // ... other fields if needed for return, but ID and Number are main ones used
    };

    // Stock updates are handled inside RPC now.
    // Inventory Alert Email Logic needs to be separate or inside RPC (RPC can't send email).
    // We can check stock *after* RPC if we want to send alerts.
    // For now, let's keep it simple and skip the alert email in this transaction block, 
    // or re-implement outside.

    // Re-implementing Stock Alert separate checking (optional but good)
    // We can query the variants *after* to see if they are low.
    for (const item of cartItems) {
        const { data: variant } = await supabase
            .from('product_variants')
            .select('stock, size, color, product:products(id, name)')
            .eq('id', item.variant_id)
            .single() as { data: any | null };

        if (variant && variant.stock < 5) {
            try {
                // ... email logic ...
                const { sendInventoryAlertEmail } = await import('@/lib/email-alerts');
                const productData: any = Array.isArray(variant.product) ? variant.product[0] : variant.product;

                await sendInventoryAlertEmail({
                    productName: productData?.name || 'Unknown',
                    variant: `Size: ${variant.size}, Color: ${variant.color}`,
                    remainingStock: variant.stock,
                    productId: productData?.id
                });
            } catch (e) {
                console.error('Failed to send inventory alert', e);
            }
        }
    }

    // 4. Send Confirmation Email
    try {
        const emailItems = cartItems.map((item: any) => ({
            name: item.name || 'Product', // Require name in cartItems
            quantity: item.quantity,
            price: (item.price * item.quantity).toFixed(2),
        }));

        await sendOrderConfirmationEmail({
            orderNumber: order.order_number,
            customerName: userName,
            customerEmail: userEmail,
            totalAmount: amount.toFixed(2),
            items: emailItems,
        });
    } catch (e) {
        console.error('Failed to send confirmation email', e);
    }

    return order;
}
