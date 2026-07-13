'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/utils/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { releaseCouponUsageForOrder } from '@/lib/coupon-accounting';
import { sendReturnApprovedWhatsApp } from '@/lib/whatsapp';

export async function updateReturnStatus(formData: FormData) {
    const supabase = await createClient() as any;
    const id = formData.get('id') as string;
    const status = formData.get('status') as any;

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

    const adminSupabase = createAdminClient();

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

        const { data: orderData } = await adminSupabase
            .from('orders')
            .select('refund_amount, refund_status')
            .eq('id', ret.order_id)
            .single();

        const order = orderData as any;
        const newRefundAmount = (order?.refund_amount || 0) + (ret.item?.price || 0);

        const { error: ordError } = await adminSupabase
            .from('orders')
            .update({
                refund_status: 'processed',
                refund_amount: newRefundAmount,
                updated_at: new Date().toISOString(),
            })
            .eq('id', ret.order_id);

        if (ordError) console.error('Order update error:', ordError);

        if (order?.refund_status !== 'processed') {
            await releaseCouponUsageForOrder(adminSupabase as any, ret.order_id).catch((error) => {
                console.error('Failed to release coupon usage for return refund', error);
            });
        }

        if (ret.item?.variant_id) {
            const { error: stockError } = await adminSupabase.rpc('increment_stock', {
                variant_id: ret.item.variant_id,
                qty: ret.item.quantity,
            });
            if (stockError) console.error('Stock restock error:', stockError);
        }
    }

    if (status === 'approved') {
        const { data: ret } = await adminSupabase
            .from('returns')
            .select('reason, order:orders(order_number), user:profiles(full_name, phone)')
            .eq('id', id)
            .single();

        const userProfile = Array.isArray((ret as any)?.user) ? (ret as any).user[0] : (ret as any)?.user;
        const order = Array.isArray((ret as any)?.order) ? (ret as any).order[0] : (ret as any)?.order;

        if (userProfile?.phone && order?.order_number) {
            sendReturnApprovedWhatsApp(
                userProfile.phone,
                userProfile.full_name || 'Customer',
                order.order_number
            ).catch((error) => console.error('[WhatsApp] Failed to send return approved automation', error));
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
