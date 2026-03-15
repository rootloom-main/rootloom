import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendAbandonedCartEmail } from '@/lib/email';
import { redis } from '@/lib/redis';
import { sendPaymentRecoveryNotification } from '@/lib/whatsapp';

export const runtime = 'nodejs';

// Add this to your vercel.json:
// { "crons": [{ "path": "/api/cron/abandoned-carts", "schedule": "0 * * * *" }] }

export async function GET(req: Request) {
    // Simple cron secret verification
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = await createClient();

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
                            await sendPaymentRecoveryNotification(
                                profile.phone,
                                profile.full_name || 'Customer',
                                cartTotal
                            );
                        }
                    }
                }
            }
        }

        return NextResponse.json({ success: true, message: `Processed abandoned carts. Sent ${emailsSent} emails.` });
    } catch (error: any) {
        console.error('Abandoned cart cron error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
