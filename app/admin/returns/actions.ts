'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/utils/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateReturnStatus(formData: FormData) {
    const supabase = await createClient() as any;
    const id = formData.get('id') as string;
    const status = formData.get('status') as any;

    // Verify Admin
    const user = await getCurrentUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        throw new Error('Forbidden');
    }

    // Update Status
    const adminSupabase = createAdminClient();

    // 1. If status is 'refund_processed', we need to perform the manual refund logic
    if (status === 'refund_processed') {
        const { data: ret, error: retError } = await adminSupabase
            .from('returns')
            .select(`
                *,
                item:order_items(variant_id, quantity, price)
            `)
            .eq('id', id)
            .single();

        if (retError || !ret) {
            throw new Error('Return record not found');
        }

        // 1.1 Update Order Status
        const { data: orderData } = await adminSupabase
            .from('orders')
            .select('refund_amount')
            .eq('id', ret.order_id)
            .single();
        
        const order = orderData as any;
        const newRefundAmount = (order?.refund_amount || 0) + (ret.item?.price || 0);

        const { error: ordError } = await adminSupabase
            .from('orders')
            .update({
                refund_status: 'processed',
                refund_amount: newRefundAmount,
                updated_at: new Date().toISOString()
            })
            .eq('id', ret.order_id);
        
        if (ordError) console.error('Order update error:', ordError);

        // 1.2 Restock Inventory
        if (ret.item?.variant_id) {
            const { error: stockError } = await adminSupabase.rpc('increment_stock', {
                variant_id: ret.item.variant_id,
                qty: ret.item.quantity
            });
            if (stockError) console.error('Stock restock error:', stockError);
        }
    }

    const { error } = await adminSupabase
        .from('returns')
        .update({
            status,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) {
        console.error('Failed to update return status:', error);
        throw new Error('Failed to update return status');
    }

    revalidatePath('/admin/returns');
    redirect('/admin/returns');
}
