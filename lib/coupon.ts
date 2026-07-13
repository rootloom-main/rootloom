import { SupabaseClient } from '@supabase/supabase-js';
import { getCache, setCache } from '@/lib/redis';

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
    cartTotal: number,
    options: { userId?: string } = {}
): Promise<CouponValidationResult> {
    const normalizedCode = code.trim().toUpperCase();

    if (normalizedCode === 'FIRSTLOOM') {
        if (!options.userId) {
            return { success: false, message: 'Please sign in to use this coupon' };
        }

        const { count } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', options.userId);

        if ((count || 0) > 0) {
            return { success: false, message: 'This first order coupon is only valid on your first purchase' };
        }

        return {
            success: true,
            message: 'First order discount applied',
            discountAmount: Math.min(cartTotal * 0.1, 300),
            couponCode: 'FIRSTLOOM',
        };
    }

    if (normalizedCode.startsWith('REF-')) {
        if (!options.userId) {
            return { success: false, message: 'Please sign in to use this referral coupon' };
        }

        const referralCode = normalizedCode.replace(/^REF-/, '');
        const { data: referrer } = await supabase
            .from('profiles')
            .select('id')
            .eq('referral_code', referralCode)
            .single();

        if (!referrer || referrer.id === options.userId) {
            return { success: false, message: 'Invalid referral coupon' };
        }

        const { count } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', options.userId);

        if ((count || 0) > 0) {
            return { success: false, message: 'Referral coupons are valid on first purchase only' };
        }

        return {
            success: true,
            message: 'Referral discount applied',
            discountAmount: Math.min(cartTotal * 0.1, 250),
            couponCode: normalizedCode,
        };
    }

    // 1. Fetch coupon
    const couponCacheKey = `coupon:${normalizedCode}`;
    const cachedCoupon = await getCache<any>(couponCacheKey);
    const couponResult = cachedCoupon
        ? { data: cachedCoupon, error: null }
        : await supabase
            .from('coupons')
            .select('*')
            .ilike('code', normalizedCode)
            .single();

    const coupon = couponResult.data;
    const error = couponResult.error;

    if (error || !coupon) {
        return { success: false, message: 'Invalid coupon code' };
    }

    if (!cachedCoupon) {
        await setCache(couponCacheKey, coupon, 300);
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
    const safeValue = Number(coupon.value) || 0;

    if (coupon.discount_type === 'flat') {
        discountAmount = safeValue;
    } else if (coupon.discount_type === 'percentage') {
        discountAmount = (cartTotal * safeValue) / 100;
        if (coupon.max_discount_amount) {
            discountAmount = Math.min(discountAmount, Number(coupon.max_discount_amount) || 0);
        }
    }

    // Sanitize to prevent NaN resulting in payment gateway crashes
    if (isNaN(discountAmount) || discountAmount < 0) {
        discountAmount = 0;
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
