'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/utils/auth';
import { revalidatePath } from 'next/cache';

export async function cancelOrder(orderId: string) {
    const supabase = await createClient() as any;
    const adminSupabase = await createAdminClient() as any;

    const user = await getCurrentUser();
    if (!user) {
        return { success: false, message: 'Unauthorized' };
    }

    const { data: order, error: fetchError } = await adminSupabase
        .from('orders')
        .select('user_id, status')
        .eq('id', orderId)
        .single();

    if (fetchError || !order) {
        return { success: false, message: 'Order not found' };
    }

    const { isAdmin } = await import('@/lib/utils/auth');
    const isUserAdmin = await isAdmin();

    if (order.user_id !== user.id && !isUserAdmin) {
        return { success: false, message: 'Unauthorized' };
    }

    try {
        const { data, error } = await adminSupabase.rpc('cancel_order_atomic', {
            p_order_id: orderId,
            p_actor_id: user.id,
            p_is_admin: isUserAdmin,
        } as any);

        if (error) {
            throw error;
        }

        if (data?.already_cancelled) {
            return { success: false, message: 'Order is already cancelled' };
        }
    } catch (error: any) {
        const message = error?.message || 'Failed to cancel order';
        if (message.includes('Cannot cancel shipped or delivered orders')) {
            return { success: false, message: 'Cannot cancel shipped or delivered orders' };
        }
        if (message.includes('Unauthorized')) {
            return { success: false, message: 'Unauthorized' };
        }
        if (message.includes('Order not found')) {
            return { success: false, message: 'Order not found' };
        }

        console.error('Error cancelling order:', error);
        return { success: false, message };
    }

    revalidatePath('/account/orders');
    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${orderId}`);

    return { success: true, message: 'Order cancelled successfully' };
}
