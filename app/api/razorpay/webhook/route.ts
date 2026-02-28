import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { processOrderCreation } from '@/lib/order-processing';
import { validateCouponLogic } from '@/lib/coupon';
import * as Sentry from '@sentry/nextjs';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const secret = webhookSecret || keySecret;

    if (!signature) {
        console.error('Webhook Error: Missing x-razorpay-signature header');
        return NextResponse.json({ message: 'Missing signature' }, { status: 400 });
    }

    if (!secret) {
        console.error('Webhook Error: RAZORPAY_WEBHOOK_SECRET and RAZORPAY_KEY_SECRET are both missing');
        return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
    }

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

    if (expectedSignature !== signature) {
        console.error('Webhook Error: Invalid signature', {
            received: signature,
            expectedLength: expectedSignature.length,
            usingWebhookSecret: !!webhookSecret
        });
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

        const notes = payment.notes;
        const userId = notes.user_id;
        const addressId = notes.address_id;
        const couponCode = notes.coupon_code || null;
        const paymentId = payment.id;
        const amountPaid = payment.amount / 100; // Convert to main currency unit

        if (!userId || !addressId) {
            console.error('Webhook Error: Missing user_id or address_id in notes', { notes });
            return NextResponse.json({ message: 'Missing metadata' }, { status: 200 });
        }

        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!serviceRoleKey || serviceRoleKey === 'your_supabase_service_role_key') {
            console.error('Webhook Error: SUPABASE_SERVICE_ROLE_KEY is missing or invalid');
            return NextResponse.json({ message: 'Admin configuration error' }, { status: 500 });
        }

        const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
        const adminSupabase = createSupabaseClient(
            supabaseUrl!,
            serviceRoleKey
        );

        // Check Idempotency
        const { data: existingOrder } = await adminSupabase
            .from('orders')
            .select('id')
            .eq('payment_id', paymentId)
            .single();

        if (existingOrder) {
            console.log(`Webhook: Order already exists for payment ${paymentId}`);
            return NextResponse.json({ received: true });
        }

        // Process Order
        try {
            // 1. Fetch User Profile for Email/Name
            const { data: userProfile } = await adminSupabase
                .from('profiles') // Assuming profiles/users table
                .select('full_name, email') // Verify column names
                .eq('id', userId)
                .single();

            // Also get email from auth if possible, but adminSupabase can't access auth.users easily without specific permission?
            // Razorpay payment entity has email/contact usually.
            const userEmail = payment.email || userProfile?.email || 'customer@example.com';
            const userName = userProfile?.full_name || 'Customer';

            // 2. Fetch Cart Logic
            // We need to fetch cart items for this user.
            const { data: cartItemsDB } = await adminSupabase
                .from('cart_items')
                .select(`
          quantity,
          product_id,
          variant_id,
          product:products(name, base_price),
          variant:product_variants(price_adjustment)
        `)
                .eq('user_id', userId);

            if (!cartItemsDB || cartItemsDB.length === 0) {
                console.error('Webhook: Cart empty for paid order', { paymentId });
                return NextResponse.json({ message: 'Cart empty' }, { status: 200 });
            }

            // Format Cart Items
            const cartItems = cartItemsDB.map((item: any) => {
                const product = Array.isArray(item.product) ? item.product[0] : item.product;
                const variant = Array.isArray(item.variant) ? item.variant[0] : item.variant;
                const price = product.base_price + (variant?.price_adjustment || 0);
                return {
                    product_id: item.product_id,
                    variant_id: item.variant_id,
                    quantity: item.quantity,
                    name: product.name,
                    price: price
                };
            });

            // 3. Recalculate Totals
            const subtotal = cartItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
            const shippingCost = subtotal > 999 ? 0 : 50;

            let discountAmount = 0;
            if (couponCode) {
                try {
                    const { validateCouponLogic } = await import('@/lib/coupon');
                    // Coupon logic might need 'supabase' client, passing adminSupabase is fine
                    const result = await validateCouponLogic(adminSupabase, couponCode, subtotal);
                    if (result.success) {
                        discountAmount = result.discountAmount || 0;
                        if (result.couponId) {
                            await adminSupabase.rpc('increment_coupon_usage', { coupon_id: result.couponId });
                        }
                    }
                } catch (e) {
                    console.error('Webhook: Coupon validation failed', e);
                }
            }

            const expectedTotal = Math.max(0, subtotal + shippingCost - discountAmount);

            // Verify Amount (Tolerance of 1 rupee for rounding?)
            if (Math.abs(expectedTotal - amountPaid) > 1) {
                console.error('Webhook: Amount mismatch', { expected: expectedTotal, paid: amountPaid });
                Sentry.captureMessage('Razorpay Webhook Amount Mismatch', {
                    extra: { paymentId, expectedTotal, amountPaid, userId }
                });

                // Return 200 to acknowledge receipt and prevent Razorpay from infinitely retrying, 
                // but DO NOT process the order to prevent fraud.
                return NextResponse.json({ success: false, message: 'Amount mismatch' }, { status: 200 });
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

            // Enterprise Phase 1: Atomically Commit Stock
            const stockItems = cartItems.map((item: any) => ({
                variant_id: item.variant_id,
                quantity: item.quantity
            }));
            await adminSupabase.rpc('commit_stock_batch', { items: stockItems });

            // 4. Clear Cart
            await adminSupabase.from('cart_items').delete().eq('user_id', userId);

            return NextResponse.json({ success: true });

        } catch (err) {
            console.error('Webhook: Processing failed', err);
            Sentry.captureException(err, {
                extra: {
                    paymentId,
                    userId,
                    event: event.event
                }
            });
            // Return 200 OK to prevent Razorpay from entering an infinite retry loop 
            // for errors that require manual intervention or code fixes anyway.
            return NextResponse.json({ success: false, message: 'Processing failed, error logged' }, { status: 200 });
        }
    }

    if (event.event === 'payment.failed') {
        const payment = event.payload.payment.entity;
        const userId = payment.notes?.user_id;

        if (userId) {
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            if (serviceRoleKey && supabaseUrl) {
                const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
                const adminSupabase = createSupabaseClient(supabaseUrl, serviceRoleKey);

                const { data: cartItemsDB } = await adminSupabase
                    .from('cart_items')
                    .select('variant_id, quantity')
                    .eq('user_id', userId);

                if (cartItemsDB && cartItemsDB.length > 0) {
                    const stockItems = cartItemsDB.map((item: any) => ({
                        variant_id: item.variant_id,
                        quantity: item.quantity
                    }));
                    await adminSupabase.rpc('release_stock_batch', { items: stockItems });
                    console.log(`Webhook: Released stock for failed payment associated with user ${userId}`);
                }
            }
        }
        return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
}
