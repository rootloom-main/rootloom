'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/utils/auth';
import { validateCouponLogic } from '@/lib/coupon';

export async function validateCoupon(code: string, cartTotal: number) {
    const supabase = await createClient();
    const user = await getCurrentUser();
    return validateCouponLogic(supabase, code, cartTotal, { userId: user?.id });
}

export async function getOrderForRetry(orderId: string) {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) {
        return { success: false, message: 'Unauthorized' };
    }

    const { data: order, error } = await supabase
        .from('orders')
        .select(`
            *,
            shipping_address:addresses(*),
            order_items(
                *,
                product:products(name, base_price, product_images(image_url)),
                variant:product_variants(size, color)
            )
        `)
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single();

    if (error || !order) {
        return { success: false, message: 'Order not found' };
    }

    // 1. Check if already paid
    if (order.payment_status === 'completed') {
        return { success: false, message: 'This order has already been paid.' };
    }

    // 2. Check if cancelled
    if (order.status === 'cancelled') {
        return { success: false, message: 'This order has been cancelled.' };
    }

    // 3. Check if expired (24h limit)
    const createdAt = new Date(order.created_at).getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    if (Date.now() - createdAt > oneDay) {
        return { success: false, message: 'This order has expired.' };
    }

    return { success: true, order };
}

