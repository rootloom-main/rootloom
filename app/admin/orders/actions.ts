'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/utils/auth';
import { revalidatePath } from 'next/cache';

export async function updateOrderNotes(formData: FormData) {
    const supabase = await createClient() as any;
    const orderId = formData.get('orderId') as string;
    const notes = formData.get('notes') as string;

    if (!orderId) {
        return { error: 'Order ID is required' };
    }

    // Verify admin
    const user = await getCurrentUser();

    if (!user) {
        return { error: 'Unauthorized' };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        return { error: 'Forbidden' };
    }

    const { error } = await supabase
        .from('orders')
        .update({ notes })
        .eq('id', orderId);

    if (error) {
        console.error('Error updating notes:', error);
        return { error: 'Failed to update notes' };
    }

    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
}
