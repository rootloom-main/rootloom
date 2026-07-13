import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendAbandonedCartEmail } from '@/lib/email';
import { redis } from '@/lib/redis';
import { sendCouponExpiryNudgeWhatsApp, sendPaymentRecoveryNotification } from '@/lib/whatsapp';
import { verifyCronRequest } from '@/lib/cron-auth';
import { recordOpsEvent } from '@/lib/ops-events';

export const runtime = 'nodejs';

// Add this to your vercel.json:
// { "crons": [{ "path": "/api/cron/abandoned-carts", "schedule": "0 * * * *" }] }

export async function GET(req: Request) {
    const cronAuth = verifyCronRequest(req);
    if (!cronAuth.ok) {
        return cronAuth.response;
    }

    try {
        const supabase = createAdminClient();

        // Fetch all cart items grouped by user
        // In Supabase, we need to query distinct users from cart_items
        const { data: cartUsers, error } = await supabase
            .from('cart_items')
            .select('user_id, updated_at, products(name, base_price), product_variants(price_adjustment), quantity')
            .order('updated_at', { ascending: false });

        if (error) throw error;
        if (!cartUsers || cartUsers.length === 0) {
            return NextResponse.json({ success: true, message: 'No abandoned carts found' });
        }

        const now = new Date().getTime();
        const oneHourMs = 60 * 60 * 1000;
        const sixHoursMs = 6 * 60 * 60 * 1000;
        const twentyFourHoursMs = 24 * 60 * 60 * 1000;

        // Group items by user
        const usersMap = new Map<string, { lastUpdated: number; items: any[] }>();

        cartUsers.forEach((row: any) => {
            const updatedAt = new Date(row.updated_at).getTime();
            const existing = usersMap.get(row.user_id);

            const product = Array.isArray(row.products) ? row.products[0] : row.products;
            const variant = Array.isArray(row.product_variants) ? row.product_variants[0] : row.product_variants;
            const price = (product?.base_price || 0) + (variant?.price_adjustment || 0);

            const itemData = {
                name: product?.name || 'Item',
                quantity: row.quantity,
                price,
                image: '' // Would fetch image here ideally
            };

            if (!existing) {
                usersMap.set(row.user_id, { lastUpdated: updatedAt, items: [itemData] });
            } else {
                existing.items.push(itemData);
                if (updatedAt > existing.lastUpdated) {
                    existing.lastUpdated = updatedAt;
                }
            }
        });

        let emailsSent = 0;

        // Process each user's cart
        for (const [userId, cartData] of usersMap.entries()) {
            const timeSinceLastUpdate = now - cartData.lastUpdated;

            if (timeSinceLastUpdate > oneHourMs) {
                // Fetch user email via Admin query or Profiles if email is stored
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, id, phone')
                    .eq('id', userId)
                    .single();

                // Note: To get raw email, we often need admin client. 
                // In this app, users table acts as profile, but email requires fetching from auth.users (Admin)
                // Here we rely on Auth Admin
                const { data: { user } } = await supabase.auth.admin.getUserById(userId);

                if (!user || !user.email) continue;

                const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

                // 24 Hour Reminder Check
                if (timeSinceLastUpdate > twentyFourHoursMs && timeSinceLastUpdate < (twentyFourHoursMs + oneHourMs)) {
                    const sent24Key = `ac_24h_${userId}`;
                    const hasSent24 = redis ? await redis.get(sent24Key) : false;

                    if (!hasSent24) {
                        await sendAbandonedCartEmail({
                            customerName: profile?.full_name || 'Customer',
                            customerEmail: user.email,
                            cartUrl: `${baseUrl}/cart`,
                            items: cartData.items,
                            tier: '24hr'
                        });
                        if (redis) await redis.set(sent24Key, 'true', { ex: 3 * 24 * 60 * 60 });
                        emailsSent++;
                    }
                }
                // 6 Hour Reminder Check
                else if (timeSinceLastUpdate > sixHoursMs && timeSinceLastUpdate < (sixHoursMs + oneHourMs)) {
                    const sent6Key = `ac_6h_${userId}`;
                    const hasSent6 = redis ? await redis.get(sent6Key) : false;

                    if (!hasSent6) {
                        await sendAbandonedCartEmail({
                            customerName: profile?.full_name || 'Customer',
                            customerEmail: user.email,
                            cartUrl: `${baseUrl}/cart`,
                            items: cartData.items,
                            tier: '6hr'
                        });
                        if (redis) await redis.set(sent6Key, 'true', { ex: 3 * 24 * 60 * 60 });
                        emailsSent++;
                    }
                }
                // 1 Hour Reminder Check
                else if (timeSinceLastUpdate > oneHourMs && timeSinceLastUpdate < sixHoursMs) {
                    const sent1Key = `ac_1h_${userId}`;
                    const hasSent1 = redis ? await redis.get(sent1Key) : false;

                    if (!hasSent1) {
                        await sendAbandonedCartEmail({
                            customerName: profile?.full_name || 'Customer',
                            customerEmail: user.email,
                            cartUrl: `${baseUrl}/cart`,
                            items: cartData.items,
                            tier: '1hr'
                        });
                        if (redis) await redis.set(sent1Key, 'true', { ex: 3 * 24 * 60 * 60 });
                        emailsSent++;

                        // Also send WhatsApp for 1h reminder if phone is available
                        if (profile?.phone) {
                            const cartTotal = cartData.items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2);
                            const didSend = await sendPaymentRecoveryNotification(
                                profile.phone,
                                profile.full_name || 'Customer',
                                cartTotal
                            );
                            await recordOpsEvent({
                                eventType: 'growth.abandoned_cart_recovery',
                                status: didSend ? 'sent' : 'failed',
                                userId,
                                channel: 'whatsapp',
                                metadata: { cart_total: cartTotal },
                            });
                        }
                    }
                }
            }
        }

        const couponNudgesSent = await sendCouponExpiryNudges(supabase as any);

        return NextResponse.json({ success: true, message: `Processed abandoned carts. Sent ${emailsSent} cart emails and ${couponNudgesSent} coupon nudges.` });
    } catch (error: any) {
        console.error('Abandoned cart cron error:', error);
        await recordOpsEvent({
            eventType: 'growth.abandoned_cart_recovery',
            status: 'failed',
            metadata: { message: error.message || 'cron_failed' },
        });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function sendCouponExpiryNudges(supabase: any) {
    const now = new Date();
    const soon = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const { data: coupons } = await supabase
        .from('coupons')
        .select('code, end_date')
        .eq('is_active', true)
        .not('end_date', 'is', null)
        .gte('end_date', now.toISOString())
        .lte('end_date', soon.toISOString())
        .limit(5);

    if (!coupons?.length) {
        return 0;
    }

    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .not('phone', 'is', null)
        .limit(100);

    let sent = 0;
    for (const coupon of coupons) {
        for (const profile of profiles || []) {
            const nudgeKey = `coupon_expiry_${coupon.code}_${profile.id}`;
            const alreadySent = redis ? await redis.get(nudgeKey) : false;
            if (alreadySent) continue;

            const didSend = await sendCouponExpiryNudgeWhatsApp(
                profile.phone,
                profile.full_name || 'Customer',
                coupon.code,
                coupon.end_date
            );

            if (didSend) {
                sent += 1;
                if (redis) await redis.set(nudgeKey, 'true', { ex: 7 * 24 * 60 * 60 });
            }
        }
    }

    return sent;
}
