'use server';

import { createClient } from '@/lib/supabase/server';
import { validateCouponLogic } from '@/lib/coupon';

export async function validateCoupon(code: string, cartTotal: number) {
    const supabase = await createClient();
    return validateCouponLogic(supabase, code, cartTotal);
}

