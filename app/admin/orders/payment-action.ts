'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/utils/auth';
import { revalidatePath } from 'next/cache';

export async function updateOrderPaymentStatus(
    orderId: string,
    paymentStatus: 'pending' | 'completed' | 'failed'
) {
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

    const updatePayload: any = {
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
    };

    if (paymentStatus === 'completed') {
        updatePayload.paid_at = new Date().toISOString();
    }

    const { error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId);

    if (error) {
        console.error('Error updating order payment status:', error.message);
        return { error: 'Failed to update payment status' };
    }

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath('/admin/orders');

    return { success: true };
}
