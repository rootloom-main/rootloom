'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/utils/auth';
import { revalidatePath } from 'next/cache';
import { releaseCouponUsageForOrder } from '@/lib/coupon-accounting';

export async function processRefund(formData: FormData) {
    const supabase = await createClient() as any;
    const adminSupabase = await createAdminClient() as any;
    const orderId = formData.get('orderId') as string;
    const amount = formData.get('amount') as string;
    const restock = formData.get('restock') === 'true';

    if (!orderId || !amount) {
        return { error: 'Order ID and refund amount are required' };
    }

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

    const { data: order, error: orderError } = await adminSupabase
        .from('orders')
        .select('payment_id, status, refund_status')
        .eq('id', orderId)
        .single();

    if (orderError || !order) {
        return { error: 'Order not found' };
    }

    const { error: updateError } = await adminSupabase
        .from('orders')
        .update({
            refund_status: 'processed',
            refund_amount: parseFloat(amount),
            updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

    if (updateError) {
        return { error: 'Refund completed but failed to update database status' };
    }

    if (order.refund_status !== 'processed') {
        await releaseCouponUsageForOrder(adminSupabase as any, orderId).catch((error) => {
            console.error('Failed to release coupon usage for refunded order', error);
        });
    }

    if (restock) {
        const { data: orderItems } = await adminSupabase
            .from('order_items')
            .select('variant_id, quantity')
            .eq('order_id', orderId);

        if (orderItems) {
            for (const item of orderItems) {
                if (item.variant_id) {
                    const { error: stockError } = await adminSupabase.rpc('increment_stock', {
                        variant_id: item.variant_id,
                        qty: item.quantity,
                    });

                    if (stockError) {
                        const { data: variant } = await supabase
                            .from('product_variants')
                            .select('stock')
                            .eq('id', item.variant_id)
                            .single();
                        if (variant) {
                            await supabase
                                .from('product_variants')
                                .update({ stock: variant.stock + item.quantity })
                                .eq('id', item.variant_id);
                        }
                    }
                }
            }
        }
    }

    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
}
