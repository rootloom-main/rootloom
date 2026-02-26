import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendAbandonedCartEmail } from '@/lib/email';

export const dynamic = 'force-dynamic'; // Use Node.js runtime and force dynamic to prevent build-time execution failures

export async function GET(req: Request) {
    // Optional: Check for auth header to secure this endpoint
    // const authHeader = req.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //     return new NextResponse('Unauthorized', { status: 401 });
    // }

    const supabase = await createClient();

    // 1. Find abandoned carts: items updated > 1h ago and < 24h ago
    // And where recovery_email_sent is false (or null)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: cartItems, error } = await supabase
        .from('cart_items')
        .select(`
            *,
            product:products(id, name, base_price, product_images(image_url)),
            variant:product_variants(id, size, color, price_adjustment)
        `)
        .lt('updated_at', oneHourAgo)
        .gt('updated_at', twentyFourHoursAgo)
        .is('recovery_email_sent', false);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!cartItems || cartItems.length === 0) {
        return NextResponse.json({ message: 'No abandoned carts found' });
    }

    // 2. Group by User and Fetch Profiles
    // Extract unique user IDs
    const userIds = Array.from(new Set(cartItems.map((item: any) => item.user_id)));

    // Fetch profiles explicitly for these user IDs
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

    // Create a map for quick lookup
    const profilesMap = new Map(profiles?.map((p: any) => [p.id, p]));

    // Group items by user_id
    const cartsByUser: Record<string, any[]> = {};
    cartItems.forEach((item: any) => {
        if (!cartsByUser[item.user_id]) {
            cartsByUser[item.user_id] = [];
        }
        cartsByUser[item.user_id].push(item);
    });

    // 3. Send Emails
    const results = [];
    for (const userId in cartsByUser) {
        const items = cartsByUser[userId];
        const user = profilesMap.get(userId);

        // If profile not found or missing email, skip
        if (!user || !user.email) continue;

        const emailItems = items.map((item: any) => ({
            name: item.product?.name || 'Item',
            quantity: item.quantity,
            price: (item.product?.base_price || 0) + (item.variant?.price_adjustment || 0),
            image: item.product?.product_images?.[0]?.image_url
        }));

        const result = await sendAbandonedCartEmail({
            customerName: user.full_name || 'Customer',
            customerEmail: user.email,
            cartUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/cart`,
            items: emailItems
        });

        if (result && result.success) {
            // 4. Mark as sent
            const itemIds = items.map((i: any) => i.id);
            await (supabase
                .from('cart_items') as any)
                .update({ recovery_email_sent: true })
                .in('id', itemIds);

            results.push({ userId, status: 'sent' });
        } else {
            results.push({ userId, status: 'failed', error: result?.error });
        }
    }

    return NextResponse.json({ success: true, results });
}
