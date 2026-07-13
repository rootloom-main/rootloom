import { SupabaseClient } from '@supabase/supabase-js';

export async function releaseCouponUsageForOrder(
    supabase: SupabaseClient,
    orderId: string
) {
    const { data, error } = await supabase.rpc('release_order_coupon_usage', {
        p_order_id: orderId,
    } as any);

    if (error) {
        throw error;
    }

    return Boolean(data);
}
