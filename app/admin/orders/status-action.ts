'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/utils/auth';
import { revalidatePath } from 'next/cache';
import {
    sendOrderShippedWhatsApp,
    sendOrderDeliveredWhatsApp,
    sendOrderCancelledWhatsApp,
    sendOutForDeliveryWhatsApp,
} from '@/lib/whatsapp';

export async function updateOrderStatus(orderId: string, status: string) {
    const supabase = await createClient() as any;

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

    // Fetch current order to get user_id, order_number, delivered_at
    const { data: order } = await supabase
        .from('orders')
        .select('delivered_at, user_id, order_number, payment_method')
        .eq('id', orderId)
        .single();

    const updatePayload: any = {
        status,
        updated_at: new Date().toISOString()
    };

    // Auto-stamp delivered_at when marking as delivered
    if (status === 'delivered' && !order?.delivered_at) {
        updatePayload.delivered_at = new Date().toISOString();
    }

    const { error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId);

    if (error) {
        console.error('Error updating order status:', error.message);
        return { error: 'Failed to update order status' };
    }

    // Send appropriate WhatsApp notification based on new status
    const notifyStatuses = ['shipped', 'out_for_delivery', 'delivered', 'cancelled'];
    if (notifyStatuses.includes(status) && order?.user_id) {
        const { data: customerProfile } = await supabase
            .from('profiles')
            .select('phone, full_name')
            .eq('id', order.user_id)
            .single();

        const phone: string | null = customerProfile?.phone || null;
        const customerName: string = customerProfile?.full_name || 'Customer';
        const orderNumber: string = order.order_number;

        if (phone) {
            if (status === 'shipped') {
                sendOrderShippedWhatsApp(phone, customerName, orderNumber).catch(console.error);
            } else if (status === 'out_for_delivery') {
                sendOutForDeliveryWhatsApp(phone, customerName, orderNumber).catch(console.error);
            } else if (status === 'delivered') {
                sendOrderDeliveredWhatsApp(phone, customerName, orderNumber).catch(console.error);
            } else if (status === 'cancelled') {
                const isCOD = order.payment_method === 'cod';
                const refundNote = isCOD ? undefined : 'Your refund will be processed within 5–7 business days.';
                sendOrderCancelledWhatsApp(phone, customerName, orderNumber, refundNote).catch(console.error);
            }
        }
    }

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath('/admin/orders');

    return { success: true };
}
