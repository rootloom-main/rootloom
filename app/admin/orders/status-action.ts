'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/utils/auth';
import { revalidatePath } from 'next/cache';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

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

    // Fetch current order to check current delivered_at and get user_id & order_number
    const { data: order } = await supabase
        .from('orders')
        .select('delivered_at, user_id, order_number')
        .eq('id', orderId)
        .single();

    const updatePayload: any = {
        status,
        updated_at: new Date().toISOString()
    };

    // Auto-stamp delivered_at if status is changing to delivered and it hasn't been stamped yet
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

    // Send WhatsApp Notification for specific statuses
    if (status === 'shipped' || status === 'delivered') {
        if (order?.user_id) {
            const { data: customerProfile } = await supabase
                .from('profiles')
                .select('phone, full_name')
                .eq('id', order.user_id)
                .single();

            if (customerProfile?.phone) {
                const customerName = customerProfile.full_name?.split(' ')[0] || 'Customer';
                let message = `Hi ${customerName}, your order #${order.order_number} has been updated.`;

                if (status === 'shipped') {
                    message = `Hi ${customerName}, good news! Your order #${order.order_number} has been shipped. Track your shipment on the Rootloom dashboard.`;
                } else if (status === 'delivered') {
                    message = `Hi ${customerName}, your order #${order.order_number} has been delivered. Thank you for shopping with Rootloom!`;
                }

                sendWhatsAppMessage(customerProfile.phone, message).catch(console.error);
            }
        }
    }

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath('/admin/orders');

    return { success: true };
}
