import { createSSRClient } from '@/lib/utils/auth';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createSSRClient();

        // 1. Fetch Low Stock Alerts
        const { data: lowStock } = await supabase
            .from('product_variants')
            .select(`
                id,
                size,
                color,
                stock,
                product:products(name)
            `)
            .lt('stock', 10)
            .order('stock', { ascending: true })
            .limit(5);

        // 2. Fetch Recent Orders (Last 24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: recentOrders } = await supabase
            .from('orders')
            .select('id, total, status, created_at')
            .gte('created_at', twentyFourHoursAgo)
            .order('created_at', { ascending: false })
            .limit(5);

        // 3. Fetch Pending Returns/Refunds
        const { data: pendingReturns } = await supabase
            .from('returns')
            .select('id, order_id, status, created_at')
            .eq('status', 'pending')
            .limit(5);

        const notifications = [
            ...(lowStock?.map(item => ({
                id: `stock-${item.id}`,
                type: 'stock',
                title: 'Low Stock Alert',
                message: `${(item as any).product?.name} (${item.size}/${item.color}) has only ${item.stock} left.`,
                timestamp: new Date().toISOString(),
                link: `/admin/inventory`
            })) || []),
            ...(recentOrders?.map(order => ({
                id: `order-${order.id}`,
                type: 'order',
                title: 'New Order Received',
                message: `Order #${order.id.slice(0, 8)} for ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(order.total)} is pending.`,
                timestamp: order.created_at,
                link: `/admin/orders`
            })) || []),
            ...(pendingReturns?.map(ret => ({
                id: `return-${ret.id}`,
                type: 'return',
                title: 'Return Requested',
                message: `New return request for Order #${ret.order_id.slice(0, 8)}.`,
                timestamp: ret.created_at,
                link: `/admin/returns`
            })) || [])
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return NextResponse.json({ notifications, count: notifications.length });
    } catch (error: any) {
        console.error('Notification API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }
}
