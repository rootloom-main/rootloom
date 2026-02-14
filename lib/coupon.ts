import { SupabaseClient } from '@supabase/supabase-js';

export type CouponValidationResult = {
    success: boolean;
    message: string;
    discountAmount?: number;
    couponCode?: string;
    couponId?: string;
};

export async function validateCouponLogic(
    supabase: SupabaseClient,
    code: string,
    cartTotal: number
): Promise<CouponValidationResult> {
    // 1. Fetch coupon
    const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code)
        .single();

    if (error || !coupon) {
        return { success: false, message: 'Invalid coupon code' };
    }

    // 2. Check active status
    if (!coupon.is_active) {
        return { success: false, message: 'Coupon is inactive' };
    }

    // 3. Check date validity
    const now = new Date();
    if (new Date(coupon.start_date) > now) {
        return { success: false, message: 'Coupon is not yet active' };
    }
    if (coupon.end_date && new Date(coupon.end_date) < now) {
        return { success: false, message: 'Coupon has expired' };
    }

    // 4. Check usage limits
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        return { success: false, message: 'Coupon usage limit reached' };
    }

    // 5. Check minimum order value
    if (coupon.min_order_value && cartTotal < coupon.min_order_value) {
        return {
            success: false,
            message: `Minimum order value of ₹${coupon.min_order_value} required`
        };
    }

    // 6. Calculate discount
    let discountAmount = 0;
    if (coupon.discount_type === 'flat') {
        discountAmount = coupon.value;
    } else if (coupon.discount_type === 'percentage') {
        discountAmount = (cartTotal * coupon.value) / 100;
        if (coupon.max_discount_amount) {
            discountAmount = Math.min(discountAmount, coupon.max_discount_amount);
        }
    }

    // Ensure discount doesn't exceed total
    discountAmount = Math.min(discountAmount, cartTotal);

    return {
        success: true,
        message: 'Coupon applied successfully',
        discountAmount,
        couponCode: coupon.code,
        couponId: coupon.id
    };
}
