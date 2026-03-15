'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/utils/auth';
import { revalidatePath } from 'next/cache';

export async function processRefund(formData: FormData) {
    const supabase = await createClient() as any;
    const adminSupabase = await createAdminClient() as any;
    const orderId = formData.get('orderId') as string;
    const amount = formData.get('amount') as string;
    const restock = formData.get('restock') === 'true';

    if (!orderId || !amount) {
        return { error: 'Order ID and refund amount are required' };
    }

    // Verify Admin
    const user = await getCurrentUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        return { error: 'Forbidden' };
    }

    // 1. Fetch the Order to get the payment ID
    const { data: order, error: orderError } = await adminSupabase
        .from('orders')
        .select('payment_id, status')
        .eq('id', orderId)
        .single();

    if (orderError || !order) {
        return { error: 'Order not found' };
    }

    // 2. Update Order Status in Database (Manual Refund)
    const { error: updateError } = await adminSupabase
        .from('orders')
        .update({
            refund_status: 'processed',
            refund_amount: parseFloat(amount),
            updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

    if (updateError) {
        return { error: 'Refund completed but failed to update database status' };
    }

    // 2. Restock Inventory if requested
    if (restock) {
        // Fetch order items
        const { data: orderItems } = await adminSupabase
            .from('order_items')
            .select('variant_id, quantity')
            .eq('order_id', orderId);

        if (orderItems) {
            for (const item of orderItems) {
                // Increment stock
                if (item.variant_id) {
                    const { error: stockError } = await adminSupabase.rpc('increment_stock', {
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
