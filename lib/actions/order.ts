'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/utils/auth';
import { revalidatePath } from 'next/cache';
import { processRazorpayRefund } from '@/lib/razorpay';

export async function cancelOrder(orderId: string) {
    const supabase = await createClient() as any;

    // Verify user is authenticated
    const user = await getCurrentUser();

    if (!user) {
        return { success: false, message: 'Unauthorized' };
    }

    // Fetch order to verify ownership and status
    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('user_id, status, payment_id, payment_status, total, refund_status')
        .eq('id', orderId)
        .single();

    if (fetchError || !order) {
        return { success: false, message: 'Order not found' };
    }

    // Check if user is admin
    const { isAdmin } = await import('@/lib/utils/auth');
    const isUserAdmin = await isAdmin();

    // Verify user owns this order OR is admin
    if (order.user_id !== user.id && !isUserAdmin) {
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

    // 2. Process Razorpay Refund if paid online
    let refundProcessed = false;
    if (order.payment_status === 'completed' && order.payment_id && !order.payment_id.startsWith('cod_')) {
        // Do not refund again if already processed
        if (order.refund_status !== 'processed') {
            try {
                await processRazorpayRefund({
                    paymentId: order.payment_id,
                    amount: order.total, // Full refund for cancellation
                });
                refundProcessed = true;
            } catch (e: any) {
                console.error(`Razorpay Refund Failed for cancellation ${orderId}:`, e.message);
                return { success: false, message: `Payment gateway failed: ${e.message}` };
            }
        }
    }

    // 3. Update order status to cancelled
    const updateData: any = { status: 'cancelled', updated_at: new Date().toISOString() };
    if (refundProcessed) {
        updateData.refund_status = 'processed';
        updateData.refund_amount = order.total;
    }

    const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

    if (updateError) {
        console.error('Error cancelling order:', updateError);
        return { success: false, message: 'Cancellation completed but failed to update status' };
    }

    revalidatePath('/account/orders');
    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${orderId}`);

    return { success: true, message: 'Order cancelled successfully' };
}
