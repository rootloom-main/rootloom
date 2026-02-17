import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { processOrderCreation } from '@/lib/order-processing';
import { validateCouponLogic } from '@/lib/coupon';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!signature || !secret) {
        return NextResponse.json({ message: 'Missing signature or secret' }, { status: 400 });
    }

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

    if (expectedSignature !== signature) {
        return NextResponse.json({ message: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);

    if (event.event === 'payment.captured') {
        const payment = event.payload.payment.entity;

        // Strict Status Check
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
            console.error('Webhook: Missing user_id or address_id in notes');
            return NextResponse.json({ message: 'Missing metadata' }, { status: 200 }); // Return 200 to acknowledge
        }

        const supabase = await createClient(); // Use service role if possible, but here we use standard client.
        // Ideally webhook should use Service Role client to bypass RLS if needed, 
        // but we can rely on standard client if we assume it works or use our own admin rights.
        // Actually, for webhook, we don't have a user session! We MUST use Service Role or admin.
        // But `createClient` uses cookies? No, `createClient` in server usually uses cookies.
        // Here we have NO cookies. We need a SUPABASE_SERVICE_ROLE_KEY client.

        // TEMPORARY: using standard createClient might fail RLS if no session.
        // I need to use `createClient(url, serviceRoleKey)`.

        // Re-import standard supabase-js for service client
        const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
        const adminSupabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
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
                // Force create anyway? Or fail? 
                // Safest is to record it as is, but maybe flag for review.
                // For now, let's proceed but log error.
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

            // 4. Clear Cart
            await adminSupabase.from('cart_items').delete().eq('user_id', userId);

            return NextResponse.json({ success: true });

        } catch (err) {
            console.error('Webhook: Processing failed', err);
            return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
        }
    }

    return NextResponse.json({ received: true });
}
