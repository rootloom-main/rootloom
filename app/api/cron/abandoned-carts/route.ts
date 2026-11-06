import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendAbandonedCartEmail } from '@/lib/email';
import { sendCouponExpiryNudgeWhatsApp, sendPaymentRecoveryNotification } from '@/lib/whatsapp';
import { verifyCronRequest } from '@/lib/cron-auth';
import { recordOpsEvent } from '@/lib/ops-events';
import { ABANDONED_CART_BATCH_SIZE, COUPON_NUDGE_BATCH_SIZE } from '@/lib/utils/cpu-batch-limits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CartReminder = {
    user_id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    cart_updated_at: string;
    reminder_tier: '1hr' | '6hr' | '24hr';
    dispatch_key: string;
    items: Array<{ name: string; quantity: number; price: number; image: string }>;
};

type CouponNudge = {
    user_id: string;
    full_name: string | null;
    phone: string;
    coupon_code: string;
    end_date: string;
    dispatch_key: string;
};

async function claimDispatch(supabase: any, key: string, type: string, userId: string) {
    const { data, error } = await supabase.rpc('claim_notification_dispatch', {
        p_idempotency_key: key,
        p_delivery_type: type,
        p_user_id: userId,
    });
    if (error) throw error;
    return data === true;
}

async function completeDispatch(supabase: any, key: string, status: 'sent' | 'failed', errorMessage?: string) {
    const { error } = await supabase.rpc('complete_notification_dispatch', {
        p_idempotency_key: key,
        p_status: status,
        p_provider_reference: null,
        p_error_message: errorMessage || null,
    });
    if (error) throw error;
}

export async function GET(req: Request) {
    const cronAuth = verifyCronRequest(req);
    if (!cronAuth.ok) return cronAuth.response;

    try {
        const supabase = createAdminClient();
        const [{ data: cartData, error: cartError }, { data: nudgeData, error: nudgeError }] = await Promise.all([
            (supabase as any).rpc('get_abandoned_cart_reminder_batch', {
                p_now: new Date().toISOString(),
                p_limit: ABANDONED_CART_BATCH_SIZE,
            }),
            (supabase as any).rpc('get_coupon_expiry_nudge_batch', {
                p_now: new Date().toISOString(),
                p_limit: COUPON_NUDGE_BATCH_SIZE,
            }),
        ]);

        if (cartError) throw cartError;
        if (nudgeError) throw nudgeError;
        const carts = (cartData || []) as CartReminder[];
        const nudges = (nudgeData || []) as CouponNudge[];

        let emailsSent = 0;
        let couponNudgesSent = 0;
        let whatsappSent = 0;

        for (const cart of carts) {
            const claimed = await claimDispatch(supabase, cart.dispatch_key, 'abandoned_cart', cart.user_id);
            if (!claimed) continue;

            let emailOk = false;
            let whatsappOk = false;
            let failure: string | undefined;
            try {
                const emailResult = await sendAbandonedCartEmail({
                    customerName: cart.full_name || 'Customer',
                    customerEmail: cart.email,
                    cartUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rootloom.in'}/cart`,
                    items: cart.items || [],
                    tier: cart.reminder_tier,
                    idempotencyKey: `${cart.dispatch_key}:email`.slice(0, 256),
                });
                emailOk = Boolean(emailResult.success);

                if (cart.reminder_tier === '1hr' && cart.phone) {
                    const cartTotal = (cart.items || [])
                        .reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0)
                        .toFixed(2);
                    whatsappOk = await sendPaymentRecoveryNotification(
                        cart.phone,
                        cart.full_name || 'Customer',
                        cartTotal,
                    );
                    await recordOpsEvent({
                        eventType: 'growth.abandoned_cart_recovery',
                        status: whatsappOk ? 'sent' : 'failed',
                        userId: cart.user_id,
                        channel: 'whatsapp',
                        metadata: { cart_total: cartTotal },
                    });
                }
            } catch (error) {
                failure = error instanceof Error ? error.message : 'cart_notification_failed';
            }

            const completed = emailOk || whatsappOk;
            await completeDispatch(supabase, cart.dispatch_key, completed ? 'sent' : 'failed', failure);
            if (emailOk) emailsSent += 1;
            if (whatsappOk) whatsappSent += 1;
        }

        for (const coupon of nudges) {
            const claimed = await claimDispatch(supabase, coupon.dispatch_key, 'coupon_expiry', coupon.user_id);
            if (!claimed) continue;

            let didSend = false;
            let failure: string | undefined;
            try {
                didSend = await sendCouponExpiryNudgeWhatsApp(
                    coupon.phone,
                    coupon.full_name || 'Customer',
                    coupon.coupon_code,
                    coupon.end_date,
                );
            } catch (error) {
                failure = error instanceof Error ? error.message : 'coupon_nudge_failed';
            }

            await completeDispatch(supabase, coupon.dispatch_key, didSend ? 'sent' : 'failed', failure);
            if (didSend) couponNudgesSent += 1;
        }

        return NextResponse.json({
            success: true,
            processedCarts: carts.length,
            emailsSent,
            whatsappSent,
            processedCouponNudges: nudges.length,
            couponNudgesSent,
        });
    } catch (error: any) {
        console.error('Abandoned cart cron error:', error);
        await recordOpsEvent({
            eventType: 'growth.abandoned_cart_recovery',
            status: 'failed',
            metadata: { message: error.message || 'cron_failed' },
        });
        return NextResponse.json({ error: 'Failed to process abandoned cart notifications' }, { status: 500 });
    }
}
