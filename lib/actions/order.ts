'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function cancelOrder(orderId: string) {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'Unauthorized' };
    }

    // Fetch order to verify ownership and status
    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('user_id, status')
        .eq('id', orderId)
        .single();

    if (fetchError || !order) {
        return { success: false, message: 'Order not found' };
    }

    // Check if user is admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

    // Verify user owns this order OR is admin
    if (order.user_id !== user.id && !isAdmin) {
        return { success: false, message: 'Unauthorized' };
    }

    // Check if order can be cancelled
    if (order.status === 'shipped' || order.status === 'delivered') {
        return { success: false, message: 'Cannot cancel shipped or delivered orders' };
    }

    if (order.status === 'cancelled') {
        return { success: false, message: 'Order is already cancelled' };
    }

    // 1. Restock Inventory
    const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('variant_id, quantity')
        .eq('order_id', orderId);

    if (itemsError) {
        console.error('Error fetching order items for cancellation:', itemsError);
        return { success: false, message: 'Failed to fetch order items' };
    }

    if (orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
            const { error: stockError } = await supabase.rpc('increment_stock', {
                variant_id: item.variant_id,
                qty: item.quantity
            });
            if (stockError) {
                console.error(`Error restocking variant ${item.variant_id}:`, stockError);
                // Continue with other items or fail? Better to log and continue or use a transaction if possible.
                // For now, logging.
            }
        }
    }

    // 2. Update order status to cancelled
    const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', orderId);

    if (updateError) {
        console.error('Error cancelling order:', updateError);
        return { success: false, message: 'Failed to cancel order' };
    }

    revalidatePath('/account/orders');
    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${orderId}`);

    return { success: true, message: 'Order cancelled successfully' };
}
