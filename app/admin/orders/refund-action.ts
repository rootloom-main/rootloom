'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function processRefund(formData: FormData) {
    const supabase = await createClient();
    const orderId = formData.get('orderId') as string;
    const amount = formData.get('amount') as string;
    const restock = formData.get('restock') === 'true';

    if (!orderId || !amount) {
        return { error: 'Order ID and refund amount are required' };
    }

    // Verify Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        return { error: 'Forbidden' };
    }

    // 1. Update Order Status
    const { error: updateError } = await supabase
        .from('orders')
        .update({
            refund_status: 'processed',
            refund_amount: parseFloat(amount),
            // Optionally set status to 'cancelled' if full refund?
            // Let's keep status as is, or maybe 'returned'?
            // user requirement: "Return & refund processing"
        })
        .eq('id', orderId);

    if (updateError) {
        return { error: 'Failed to update order refund status' };
    }

    // 2. Restock Inventory if requested
    if (restock) {
        // Fetch order items
        const { data: orderItems } = await supabase
            .from('order_items')
            .select('variant_id, quantity')
            .eq('order_id', orderId);

        if (orderItems) {
            for (const item of orderItems) {
                // Increment stock
                // Note: This is not atomic without a stored procedure, but sufficient for now.
                // Ideally use rpc increment_stock
                if (item.variant_id) {
                    const { error: stockError } = await supabase.rpc('increment_stock', {
                        variant_id: item.variant_id,
                        qty: item.quantity
                    });

                    // Fallback if rpc doesn't exist (it should from previous migrations, but let's be safe)
                    if (stockError) {
                        // Manual fetch and update (race condition possible but acceptable for admin action)
                        const { data: variant } = await supabase.from('product_variants').select('stock').eq('id', item.variant_id).single();
                        if (variant) {
                            await supabase.from('product_variants').update({ stock: variant.stock + item.quantity }).eq('id', item.variant_id);
                        }
                    }
                }
            }
        }
    }

    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
}
