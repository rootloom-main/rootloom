import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { processOrderCreation } from '@/lib/order-processing';
import { sendPaymentRecoveryNotification } from '@/lib/whatsapp';
import * as Sentry from '@sentry/nextjs';
import { formatPrice } from '@/lib/utils/format';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature) {
        console.error('Webhook Error: Missing x-razorpay-signature header');
        return NextResponse.json({ message: 'Missing signature' }, { status: 400 });
    }

    if (!webhookSecret) {
        console.error('Webhook Error: RAZORPAY_WEBHOOK_SECRET is missing');
        return NextResponse.json({ message: 'Server configuration error: Webhook Secret missing' }, { status: 500 });
    }

    const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

    if (expectedSignature !== signature) {
        console.error('Webhook Error: Invalid signature');
        return NextResponse.json({ message: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    console.log(`Webhook Received: ${event.event}`, { id: event.id });

    if (event.event === 'payment.captured') {
        const payment = event.payload.payment.entity;

        if (payment.status !== 'captured') {
            console.log(`Webhook: Payment status is ${payment.status}, ignoring.`);
            return NextResponse.json({ received: true });
        }

        const notes = payment.notes || {};
        
        // 1. Fetch Payment Record (Critical for recovery)
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!serviceRoleKey || !supabaseUrl) {
            console.error('Webhook Error: Admin credentials missing');
            return NextResponse.json({ message: 'Admin configuration error' }, { status: 500 });
        }

        const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
        const adminSupabase = createSupabaseClient(supabaseUrl, serviceRoleKey);

        const { data: paymentRecord } = await adminSupabase
            .from('payments')
            .select('*')
            .eq('razorpay_order_id', payment.order_id)
            .single();

        const userId = notes.user_id || paymentRecord?.user_id;
        const addressId = notes.address_id || paymentRecord?.address_id;
        const couponCode = notes.coupon_code || paymentRecord?.coupon_code || null;
        
        const paymentId = payment.id;
        const amountPaid = payment.amount / 100;

        if (!userId || !addressId) {
            console.error('Webhook Error: Missing user_id or address_id even in recovery record', { notes, paymentRecord });
            return NextResponse.json({ message: 'Missing metadata' }, { status: 200 }); // Return 200 to RP
        }

        // Check Idempotency
        const { data: existingOrder } = await adminSupabase
            .from('orders')
            .select('id')
            .eq('payment_id', paymentId)
            .single();

        if (existingOrder) {
            console.log(`Webhook: Order already exists for payment ${paymentId} (Normal deduplication)`);
            return NextResponse.json({ received: true });
        }

        // Process Order
        try {
            // 2. Fetch User Profile
            const { data: userProfile } = await adminSupabase
                .from('profiles')
                .select('full_name, email')
                .eq('id', userId)
                .single();

            const userEmail = payment.email || userProfile?.email || 'customer@example.com';
            const userName = userProfile?.full_name || 'Customer';

            // 3. Fetch Cart Items (Try active cart first, then use snapshot)
            let cartItems = [];
            const { data: activeCartItems } = await adminSupabase
                .from('cart_items')
                .select(`
                    quantity,
                    product_id,
                    variant_id,
                    product:products(name, base_price),
                    variant:product_variants(price_adjustment)
                `)
                .eq('user_id', userId);

            if (activeCartItems && activeCartItems.length > 0) {
                console.log(`Webhook: Processing order using ACTIVE CART for user ${userId}`);
                cartItems = activeCartItems.map((item: any) => {
                    const product = Array.isArray(item.product) ? item.product[0] : item.product;
                    const variant = Array.isArray(item.variant) ? item.variant[0] : item.variant;
                    const price = (product?.base_price || 0) + (variant?.price_adjustment || 0);
                    return {
                        product_id: item.product_id,
                        variant_id: item.variant_id,
                        quantity: item.quantity,
                        name: product?.name || 'Item',
                        price: price
                    };
                });
            } else if (paymentRecord?.cart_snapshot) {
                console.log(`Webhook: RECOVERY MODE - Active cart empty, using SNAPSHOT for user ${userId}`);
                cartItems = paymentRecord.cart_snapshot;
            } else {
                console.error('Webhook: CRITICAL ERROR - No active cart and no snapshot found', { paymentId });
                return NextResponse.json({ message: 'Cart recovery failed' }, { status: 200 });
            }

            // 4. Recalculate Totals
            const subtotal = cartItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
            const shippingCost = subtotal > 999 ? 0 : 50;

            let discountAmount = 0;
            if (couponCode) {
                try {
                    const { validateCouponLogic } = await import('@/lib/coupon');
                    const result = await validateCouponLogic(adminSupabase, couponCode, subtotal);
                    if (result.success && result.discountAmount !== undefined) {
                        discountAmount = result.discountAmount;
                        if (result.couponId) {
                            await adminSupabase.rpc('increment_coupon_usage', { coupon_id: result.couponId });
                        }
                    }
                } catch (e) {
                    console.error('Webhook: Coupon validation failed', e);
                }
            }

            const expectedTotal = Math.round(Math.max(0, subtotal + shippingCost - discountAmount));

            // Verify Amount
            if (expectedTotal !== amountPaid) {
                console.warn('Webhook: Amount mismatch (proceeding with amount_paid)', { expected: expectedTotal, paid: amountPaid });
            }

            await processOrderCreation({
                supabase: adminSupabase,
                userId,
                paymentId,
                amount: amountPaid,
                cartItems,
                addressId,
                discountAmount,
                couponCode,
                shippingCost,
                subtotal,
                userEmail,
                userName
            });

            // 5. Cleanup
            await adminSupabase.from('cart_items').delete().eq('user_id', userId);

            await adminSupabase
                .from('payments')
                .update({ status: 'success', updated_at: new Date().toISOString() })
                .eq('razorpay_order_id', payment.order_id);

            return NextResponse.json({ success: true, recovered: !activeCartItems?.length });

        } catch (err: any) {
            console.error('Webhook: Order processing failed', err);
            Sentry.captureException(err, { extra: { paymentId, userId } });
            return NextResponse.json({ success: false, message: 'Processing failed' }, { status: 200 });
        }
    }

    if (event.event === 'payment.failed') {
        const payment = event.payload.payment.entity;
        const notes = payment.notes || {};
        const userId = notes.user_id;

        if (userId) {
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            if (serviceRoleKey && supabaseUrl) {
                const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
                const adminSupabase = createSupabaseClient(supabaseUrl, serviceRoleKey);

                // Update Payments Table Status
                await adminSupabase
                    .from('payments')
                    .update({ status: 'failed', updated_at: new Date().toISOString() })
                    .eq('razorpay_order_id', payment.order_id);

                // NOTE: We do NOT release stock here because we no longer "reserve" it in create-order.
                // Releasing it now would cause stock inflating bugs.

                // Send WhatsApp Recovery Notification
                try {
                    const { data: userProfile } = await adminSupabase
                        .from('profiles')
                        .select('full_name, phone')
                        .eq('id', userId)
                        .single();

                    const customerPhone = payment.contact || userProfile?.phone;
                    const customerName = userProfile?.full_name || 'Valued Customer';
                    const amountFormatted = formatPrice(payment.amount / 100);

                    if (customerPhone) {
                        await sendPaymentRecoveryNotification(customerPhone, customerName, amountFormatted);
                        console.log(`Webhook: Sent WhatsApp recovery message to ${customerPhone}`);
                    }
                } catch (waErr) {
                    console.error('Webhook: Failed to send recovery WhatsApp', waErr);
                }
            }
        }
        return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
}
