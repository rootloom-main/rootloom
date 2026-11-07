export const dynamic = 'force-dynamic';

import { createSSRClient } from '@/lib/utils/auth';
import { getCurrentUser } from '@/lib/utils/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatPrice } from '@/lib/utils/format';
import {
    Clock,
    Truck,
    CheckCircle2,
    XCircle,
    RefreshCcw,
    AlertTriangle,
    PackageSearch,
    ArrowRight,
    TrendingUp,
    TrendingDown,
    Activity,
    Package,
    ShoppingBag,
    Megaphone,
    MessageCircle,
    Smartphone,
    TicketPercent,
    Users2,
    ShieldCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SalesChart } from '@/components/admin/analytics/sales-chart';
import { CategoryPieChart } from '@/components/admin/analytics/category-pie-chart';
import { AdminAnalyticsHeader } from '@/components/admin/analytics/admin-analytics-header';

export default async function AdminAnalyticsPage() {
    const supabase = await createSSRClient();
    const adminSupabase = createAdminClient();
    const user = await getCurrentUser();

    if (!user) {
        redirect('/auth/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single() as { data: any | null };

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        redirect('/');
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Fetch core analytics with resilient fallback (never throws unhandled PostgREST errors)
    let analyticsCore: any = null;
    try {
        const { data: coreData, error: coreError } = await (adminSupabase as any).rpc('get_admin_analytics_core', {
            p_week_start: sevenDaysAgo.toISOString(),
            p_previous_week_start: fourteenDaysAgo.toISOString(),
            p_thirty_days_start: thirtyDaysAgo.toISOString(),
        });
        if (!coreError && coreData) {
            analyticsCore = coreData;
        }
    } catch {
        // Fall back to direct resilient queries
    }

    if (!analyticsCore) {
        try {
            const [
                { data: allOrders },
                { data: orderItems },
                { count: totalCustCount },
                { data: cartItems },
                { data: categoryOrderItems }
            ] = await Promise.all([
                adminSupabase.from('orders').select('id, total, status, created_at'),
                adminSupabase.from('order_items').select('quantity, price, product:products(name)'),
                adminSupabase.from('profiles').select('*', { count: 'exact', head: true }),
                adminSupabase.from('cart_items').select('user_id'),
                adminSupabase.from('order_items').select('quantity, price, product:products(categories(name))')
            ]);

            const validOrders = (allOrders || []).filter((o: any) => o.status !== 'cancelled');
            const totalRevenue = validOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
            const totalOrders = validOrders.length;

            const currentWeekOrders = validOrders.filter((o: any) => new Date(o.created_at) >= sevenDaysAgo);
            const previousWeekOrders = validOrders.filter((o: any) => {
                const d = new Date(o.created_at);
                return d >= fourteenDaysAgo && d < sevenDaysAgo;
            });

            const currentRevenue = currentWeekOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
            const previousRevenue = previousWeekOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
            const currentVolume = currentWeekOrders.length;
            const previousVolume = previousWeekOrders.length;

            const statusCountsMap = {
                pending_count: (allOrders || []).filter((o: any) => o.status === 'pending' || o.status === 'processing').length,
                shipped_count: (allOrders || []).filter((o: any) => o.status === 'shipped').length,
                delivered_count: (allOrders || []).filter((o: any) => o.status === 'delivered').length,
                cancelled_count: (allOrders || []).filter((o: any) => o.status === 'cancelled').length,
                refunded_count: (allOrders || []).filter((o: any) => o.status === 'refunded').length,
            };

            const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
            (orderItems || []).forEach((item: any) => {
                const name = item.product?.name || 'Unknown Product';
                if (!productSales[name]) {
                    productSales[name] = { name, quantity: 0, revenue: 0 };
                }
                productSales[name].quantity += Number(item.quantity) || 0;
                productSales[name].revenue += (Number(item.quantity) || 0) * (Number(item.price) || 0);
            });
            const topProductsList = Object.values(productSales)
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5);

            const categorySalesMap: Record<string, number> = {};
            (categoryOrderItems || []).forEach((item: any) => {
                const catName = item.product?.categories?.name || 'Uncategorized';
                categorySalesMap[catName] = (categorySalesMap[catName] || 0) + ((Number(item.quantity) || 0) * (Number(item.price) || 0));
            });
            const categorySalesList = Object.entries(categorySalesMap)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);

            const dailySalesMap: Record<string, number> = {};
            (allOrders || [])
                .filter((o: any) => o.status !== 'cancelled' && new Date(o.created_at) >= thirtyDaysAgo)
                .forEach((order: any) => {
                    const d = new Date(order.created_at);
                    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    dailySalesMap[dateKey] = (dailySalesMap[dateKey] || 0) + (Number(order.total) || 0);
                });

            const uniqueAbandonedUsers = new Set((cartItems || []).map((item: any) => item.user_id)).size;

            analyticsCore = {
                orders: {
                    revenue: totalRevenue,
                    order_count: totalOrders,
                    current_revenue: currentRevenue,
                    previous_revenue: previousRevenue,
                    current_volume: currentVolume,
                    previous_volume: previousVolume,
                    ...statusCountsMap
                },
                total_customers: totalCustCount || 0,
                abandoned_cart_count: uniqueAbandonedUsers,
                top_products: topProductsList,
                daily_sales: dailySalesMap,
                category_sales: categorySalesList
            };
        } catch (err) {
            console.error('Error fetching fallback analytics:', err);
            analyticsCore = {
                orders: {},
                total_customers: 0,
                abandoned_cart_count: 0,
                top_products: [],
                daily_sales: {},
                category_sales: []
            };
        }
    }

    const orderMetrics = analyticsCore?.orders || {};
    const totalCustomers = Number(analyticsCore?.total_customers || 0);
    const abandonedCartCount = Number(analyticsCore?.abandoned_cart_count || 0);

    // Recent order and inventory lists remain bounded, display-specific queries.
    const { data: recentOrders } = await adminSupabase
        .from('orders')
        .select(`
            id,
            total,
            status,
            created_at,
            profiles (full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(8) as { data: any[] | null };

    // 4. Fetch Inventory Alerts (Low stock < 10)
    const { data: inventoryAlerts } = await adminSupabase
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
        .limit(10) as { data: any[] | null };

    // 7. Fetch active campaigns
    const { count: activeCampaigns } = await ((adminSupabase.from('marketing_campaigns' as any) as any)
        .select('*', { count: 'exact', head: true })
        .in('status', ['processing', 'scheduled'])) as any;

    const { data: payments7d } = await (adminSupabase
        .from('payments' as any)
        .select('id, status, created_at, amount, coupon_code, metadata')
        .gte('created_at', sevenDaysAgo.toISOString())) as any;

    const { data: opsEvents7d } = await (adminSupabase
        .from('ops_events' as any)
        .select('event_type, status, channel, created_at, metadata')
        .gte('created_at', sevenDaysAgo.toISOString())) as any;

    const { data: otpEvents7d } = await (adminSupabase
        .from('auth_otp_audit_log' as any)
        .select('event, created_at')
        .gte('created_at', sevenDaysAgo.toISOString())) as any;

    const { count: pendingWaitlistCount } = await (adminSupabase
        .from('product_waitlist' as any)
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')) as any;

    const { count: totalReturns } = await adminSupabase
        .from('returns')
        .select('*', { count: 'exact', head: true });

    const { count: couponOrderCount } = await adminSupabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .not('coupon_code', 'is', null);

    const { count: referralOrderCount } = await adminSupabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .ilike('coupon_code', 'REF-%');

    const { count: codOrderCount } = await adminSupabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .ilike('payment_id', 'COD_%');

    const { data: inventoryAnomalies } = await (adminSupabase
        .from('inventory_reservation_reconciliation' as any)
        .select('variant_id, reserved_quantity_delta')
        .limit(10)) as any;

    // Aggregate all-history metrics and charts in one database-side RPC.
    const totalRevenue = Number(orderMetrics.revenue || 0);
    const totalOrders = Number(orderMetrics.order_count || 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const currentRev = Number(orderMetrics.current_revenue || 0);
    const prevRev = Number(orderMetrics.previous_revenue || 0);
    const revGrowth = prevRev === 0 ? (currentRev > 0 ? 100 : 0) : ((currentRev - prevRev) / prevRev) * 100;

    const currentVol = Number(orderMetrics.current_volume || 0);
    const prevVol = Number(orderMetrics.previous_volume || 0);
    const volGrowth = prevVol === 0 ? (currentVol > 0 ? 100 : 0) : ((currentVol - prevVol) / prevVol) * 100;

    const statusCounts = {
        pending: Number(orderMetrics.pending_count || 0),
        shipped: Number(orderMetrics.shipped_count || 0),
        delivered: Number(orderMetrics.delivered_count || 0),
        cancelled: Number(orderMetrics.cancelled_count || 0),
        refunded: Number(orderMetrics.refunded_count || 0),
    };

    const topProducts = ((analyticsCore.top_products || []) as any[]).map((product: any) => ({
        ...product,
        quantity: Number(product.quantity || 0),
        revenue: Number(product.revenue || 0),
    }));

    // SQL returns only daily totals; keep the same 30-day display labels.
    const dailySales = analyticsCore.daily_sales || {};
    const chartData: { name: string; total: number }[] = [];

    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        chartData.push({ name: dateStr, total: Number(dailySales[dateKey] || 0) });
    }

    const pieChartData = (analyticsCore.category_sales || []).map((item: any) => ({
        name: item.name,
        value: Number(item.value || 0),
    })).sort((a: any, b: any) => b.value - a.value);

    const totalPayments = payments7d?.length || 0;
    const successfulPayments = payments7d?.filter((payment: any) => payment.status === 'success').length || 0;
    const paymentSuccessRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;
    const couponConversions = couponOrderCount || 0;
    const referralConversions = referralOrderCount || 0;
    const whatsappEvents = (opsEvents7d || []).filter((event: any) => event.channel === 'whatsapp');
    const smsFallbackEvents = (opsEvents7d || []).filter((event: any) => event.channel === 'sms');
    const whatsappDeliveryRate = whatsappEvents.length
        ? (whatsappEvents.filter((event: any) => event.status === 'success').length / whatsappEvents.length) * 100
        : 0;
    const smsFallbackRate = (whatsappEvents.length + smsFallbackEvents.length) > 0
        ? (smsFallbackEvents.filter((event: any) => event.status === 'success').length / (whatsappEvents.length + smsFallbackEvents.length)) * 100
        : 0;
    const otpFailures = (otpEvents7d || []).filter((event: any) => String(event.event || '').includes('failed') || String(event.event || '').includes('locked')).length;
    const otpFailureRate = (otpEvents7d?.length || 0) > 0 ? (otpFailures / (otpEvents7d?.length || 1)) * 100 : 0;
    const webhookRetryQueue = (payments7d || []).filter((payment: any) => payment.status === 'pending').length;
    const recoveredOrders = (payments7d || []).filter((payment: any) => ['retry', 'browser_switch'].includes(String(payment.metadata?.recovered_via || ''))).length;
    const abandonedRecoveryEvents = (opsEvents7d || []).filter((event: any) => event.event_type === 'growth.abandoned_cart_recovery');
    const abandonedRecoveryRate = abandonedRecoveryEvents.length
        ? (abandonedRecoveryEvents.filter((event: any) => event.status === 'sent').length / abandonedRecoveryEvents.length) * 100
        : 0;
    const couponConversionRate = totalOrders > 0 ? (couponConversions / totalOrders) * 100 : 0;
    const referralConversionRate = totalOrders > 0 ? (referralConversions / totalOrders) * 100 : 0;
    const codConfirmationRate = totalOrders > 0 ? ((codOrderCount || 0) / totalOrders) * 100 : 0;
    const returnRate = totalOrders > 0 ? ((totalReturns || 0) / totalOrders) * 100 : 0;
    const inventoryAnomalyCount = inventoryAnomalies?.length || 0;

    return (
        <div className="min-h-screen bg-stone-50/50">
            <div className="container mx-auto px-6 py-10 space-y-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-stone-200 pb-8">
                    <div>
                        <Badge variant="outline" className="mb-4 border-raw-clay/30 text-raw-clay font-medium px-3 py-1 rounded-full bg-raw-clay/5">
                            Admin Intelligence
                        </Badge>
                        <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-deep-forest mb-3">
                            Welcome back, Samir Pandey
                        </h1>
                        <p className="text-stone-500 font-medium text-lg italic">
                            &quot;Luxury is in each detail.&quot; - Your empire&apos;s performance at a glance.
                        </p>
                    </div>
                    <AdminAnalyticsHeader
                        totalRevenue={totalRevenue}
                        totalOrders={totalOrders}
                        averageOrderValue={averageOrderValue}
                        totalCustomers={totalCustomers || 0}
                    />
                </div>

                {/* Primary Metrics */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {[
                        { label: 'Growth Revenue', value: formatPrice(totalRevenue), trend: `${revGrowth >= 0 ? '+' : ''}${revGrowth.toFixed(1)}%`, icon: TrendingUp, color: revGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600', bg: revGrowth >= 0 ? 'bg-emerald-50' : 'bg-rose-50' },
                        { label: 'Total Volume', value: totalOrders, trend: `${volGrowth >= 0 ? '+' : ''}${volGrowth.toFixed(1)}%`, icon: Activity, color: volGrowth >= 0 ? 'text-blue-600' : 'text-rose-600', bg: volGrowth >= 0 ? 'bg-blue-50' : 'bg-rose-50' },
                        { label: 'Avg Ticket', value: formatPrice(averageOrderValue), trend: '7D Avg', icon: TrendingDown, color: 'text-stone-600', bg: 'bg-stone-50' },
                        { label: 'Total Customers', value: totalCustomers || '0', trend: 'Lifetime', icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50' },
                    ].map((m) => (
                        <Card key={m.label} className="border-stone-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden group hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] transition-all duration-300">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={cn("p-2.5 rounded-xl", m.bg)}>
                                        <m.icon className={cn("w-5 h-5", m.color)} />
                                    </div>
                                    <Badge variant="secondary" className={cn("rounded-lg font-bold text-[10px]", m.color.includes('emerald') ? 'bg-emerald-50 text-emerald-600' : m.color.includes('rose') ? 'bg-rose-50 text-rose-600' : 'bg-stone-100 text-stone-600')}>
                                        {m.trend}
                                    </Badge>
                                </div>
                                <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-1">{m.label}</h3>
                                <p className="text-3xl font-bold text-deep-forest tracking-tight">{m.value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Status Breakdown Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="h-1.5 w-8 bg-purple-500 rounded-full" />
                        <h2 className="text-xl font-bold text-deep-forest uppercase tracking-tighter">Operational Pipeline</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                            { label: 'Pending', count: statusCounts.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                            { label: 'Shipped', count: statusCounts.shipped, icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: 'Delivered', count: statusCounts.delivered, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Cancelled', count: statusCounts.cancelled, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
                            { label: 'Refunded', count: statusCounts.refunded, icon: RefreshCcw, color: 'text-purple-600', bg: 'bg-purple-50' },
                        ].map((s) => (
                            <Card key={s.label} className="border-stone-100 shadow-sm rounded-xl hover:border-stone-200 transition-colors">
                                <CardContent className="p-4 flex flex-col items-center text-center">
                                    <div className={cn("p-2 rounded-lg mb-2", s.bg)}>
                                        <s.icon className={cn("w-4 h-4", s.color)} />
                                    </div>
                                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none mb-1">{s.label}</span>
                                    <span className="text-xl font-bold text-deep-forest">{s.count}</span>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Marketing Metrics Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="h-1.5 w-8 bg-amber-500 rounded-full" />
                        <h2 className="text-xl font-bold text-deep-forest uppercase tracking-tighter">Marketing & Conversion</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Card className="border-stone-100 shadow-sm rounded-xl bg-amber-50/10 border-l-4 border-l-amber-500">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-amber-100 rounded-xl text-amber-700">
                                        <ShoppingBag className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Abandoned Bags</p>
                                        <p className="text-2xl font-bold text-deep-forest">{abandonedCartCount}</p>
                                    </div>
                                </div>
                                <Link 
                                    href="/admin/marketing/campaigns/new?audience=abandoned_cart" 
                                    className="mt-4 flex items-center justify-between text-xs font-bold text-amber-700 hover:text-amber-800"
                                >
                                    Recover Now <ArrowRight className="w-3 h-3" />
                                </Link>
                            </CardContent>
                        </Card>
                        <Card className="border-stone-100 shadow-sm rounded-xl bg-indigo-50/10 border-l-4 border-l-indigo-500">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-indigo-100 rounded-xl text-indigo-700">
                                        <Megaphone className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Active Campaigns</p>
                                        <p className="text-2xl font-bold text-deep-forest">{activeCampaigns || 0}</p>
                                    </div>
                                </div>
                                <Link 
                                    href="/admin/marketing/campaigns" 
                                    className="mt-4 flex items-center justify-between text-xs font-bold text-indigo-700 hover:text-indigo-800"
                                >
                                    Manage Broadcasts <ArrowRight className="w-3 h-3" />
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="h-1.5 w-8 bg-deep-forest rounded-full" />
                        <h2 className="text-xl font-bold text-deep-forest uppercase tracking-tighter">Launch Console</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {[
                            { label: 'Payment Success', value: `${paymentSuccessRate.toFixed(1)}%`, icon: ShieldCheck, tone: 'bg-emerald-50 text-emerald-700' },
                            { label: 'Webhook Retry Queue', value: webhookRetryQueue, icon: RefreshCcw, tone: 'bg-amber-50 text-amber-700' },
                            { label: 'Abandoned Recovery', value: `${abandonedRecoveryRate.toFixed(1)}%`, icon: ShoppingBag, tone: 'bg-amber-50 text-amber-700' },
                            { label: 'Coupon Conversion', value: `${couponConversionRate.toFixed(1)}%`, icon: TicketPercent, tone: 'bg-blue-50 text-blue-700' },
                            { label: 'Referral Conversion', value: `${referralConversionRate.toFixed(1)}%`, icon: Users2, tone: 'bg-purple-50 text-purple-700' },
                            { label: 'COD Confirmation', value: `${codConfirmationRate.toFixed(1)}%`, icon: Package, tone: 'bg-orange-50 text-orange-700' },
                            { label: 'Return Rate', value: `${returnRate.toFixed(1)}%`, icon: RefreshCcw, tone: 'bg-rose-50 text-rose-700' },
                            { label: 'WhatsApp Delivery', value: `${whatsappDeliveryRate.toFixed(1)}%`, icon: MessageCircle, tone: 'bg-emerald-50 text-emerald-700' },
                            { label: 'SMS Fallback', value: `${smsFallbackRate.toFixed(1)}%`, icon: Smartphone, tone: 'bg-stone-100 text-stone-700' },
                            { label: 'OTP Failure', value: `${otpFailureRate.toFixed(1)}%`, icon: AlertTriangle, tone: 'bg-rose-50 text-rose-700' },
                            { label: 'Recovered Payments', value: recoveredOrders, icon: Activity, tone: 'bg-cyan-50 text-cyan-700' },
                            { label: 'Waitlist Leads', value: pendingWaitlistCount || 0, icon: ShoppingBag, tone: 'bg-indigo-50 text-indigo-700' },
                            { label: 'Inventory Anomalies', value: inventoryAnomalyCount, icon: AlertTriangle, tone: inventoryAnomalyCount > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700' },
                        ].map((metric) => (
                            <Card key={metric.label} className="border-stone-100 shadow-sm rounded-xl">
                                <CardContent className="p-4 flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400 font-bold">{metric.label}</p>
                                        <p className="mt-2 text-2xl font-bold text-deep-forest">{metric.value}</p>
                                    </div>
                                    <div className={cn('p-2 rounded-lg', metric.tone)}>
                                        <metric.icon className="w-4 h-4" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Main Content Grid: Charts & Alerts */}
                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <Card className="border-stone-100 shadow-xl rounded-2xl h-full">
                            <CardHeader className="border-b border-stone-50 pb-6 px-8 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl font-serif text-deep-forest">Market Performance</CardTitle>
                                    <CardDescription>Daily revenue trends and category distribution.</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 space-y-10">
                                <SalesChart data={chartData} />
                                <div className="grid md:grid-cols-2 gap-8 pt-6 border-t border-stone-50">
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400">Category Mix</h4>
                                        <CategoryPieChart data={pieChartData} />
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400">Top Performers</h4>
                                        <div className="space-y-3">
                                            {topProducts.map((p, i) => (
                                                <div key={p.name} className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-5 h-5 rounded bg-stone-100 flex items-center justify-center text-[10px] font-bold text-stone-600">{i + 1}</span>
                                                        <span className="font-medium text-stone-700 truncate max-w-[120px]">{p.name}</span>
                                                    </div>
                                                    <span className="font-bold text-deep-forest">{formatPrice(p.revenue)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-8">
                        {/* Inventory Alerts */}
                        <Card className="border-stone-100 shadow-xl rounded-2xl border-l-4 border-l-rose-500 bg-rose-50/20">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                                    <CardTitle className="text-lg font-serif text-deep-forest">Stock Alerts</CardTitle>
                                </div>
                                <CardDescription className="text-rose-700/70">Immediate attention required.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {inventoryAlerts?.map((item: any) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-white/60 border border-rose-100/50 shadow-sm">
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-bold text-deep-forest truncate">{item.product?.name}</p>
                                            <p className="text-[10px] text-stone-500 font-medium">Size: {item.size} • Color: {item.color}</p>
                                        </div>
                                        <Badge className={cn("rounded-lg px-2 py-0.5 font-bold text-[10px] min-w-[3rem] justify-center", item.stock === 0 ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600")}>
                                            {item.stock === 0 ? 'OOS' : `${item.stock} left`}
                                        </Badge>
                                    </div>
                                ))}
                                {(!inventoryAlerts || inventoryAlerts.length === 0) && (
                                    <div className="text-center py-6">
                                        <PackageSearch className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                                        <p className="text-xs text-stone-500 font-medium">All stock levels healthy.</p>
                                    </div>
                                )}
                                <Button variant="link" className="w-full text-rose-600 text-xs font-bold gap-1" asChild>
                                    <Link href="/admin/inventory">Manage Inventory <ArrowRight className="w-3 h-3" /></Link>
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Quick Access Sidebar? */}
                        <Card className="border-stone-100 shadow-xl rounded-2xl">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg font-serif text-deep-forest">Live Activity</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-stone-50">
                                    {recentOrders?.slice(0, 4).map((order: any) => (
                                        <div key={order.id} className="p-4 hover:bg-stone-50/50 transition-colors">
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="text-xs font-bold text-deep-forest">{order.profiles?.full_name || 'Guest User'}</p>
                                                <span className="text-[10px] text-stone-400 font-medium">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <p className="text-[10px] text-stone-500 uppercase tracking-widest">Order #{order.id?.slice(0, 8) || 'N/A'}</p>
                                                <span className="text-xs font-bold text-emerald-600">{formatPrice(order.total)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Recent Orders Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-deep-forest p-2 rounded-xl">
                                <Package className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-2xl font-serif font-bold text-deep-forest italic">Recent Transactions</h2>
                        </div>
                        <Link href="/admin/orders">
                            <Button variant="ghost" className="text-stone-500 font-bold text-xs tracking-widest uppercase hover:text-deep-forest transition-colors">
                                View All Orders <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </Link>
                    </div>

                    <Card className="border-stone-100 shadow-2xl rounded-2xl overflow-hidden">
                        <Table>
                            <TableHeader className="bg-stone-50/50">
                                <TableRow className="border-stone-100 hover:bg-transparent">
                                    <TableHead className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 py-6 px-6">Order ID</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 py-6">Customer</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 py-6">Amount</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 py-6">Status</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 py-6 text-right px-6">Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentOrders?.map((order) => (
                                    <TableRow key={order.id} className="border-stone-50 hover:bg-stone-50/30 transition-colors group">
                                        <TableCell className="py-5 px-6 font-mono text-xs text-stone-500 font-medium group-hover:text-deep-forest transition-colors">
                                            #{order.id?.slice(0, 8).toUpperCase() || 'N/A'}
                                        </TableCell>
                                        <TableCell className="py-5 font-bold text-deep-forest text-sm">
                                            {order.profiles?.full_name || 'Anonymous Heirloom'}
                                        </TableCell>
                                        <TableCell className="py-5 font-extrabold text-stone-800">
                                            {formatPrice(order.total)}
                                        </TableCell>
                                        <TableCell className="py-5">
                                            <Badge className={cn(
                                                "rounded-lg font-bold text-[10px] px-2.5 py-1 min-w-[5rem] justify-center tracking-wider",
                                                order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                    order.status === 'shipped' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                        order.status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                            'bg-stone-100 text-stone-500'
                                            )}>
                                                {order.status.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-5 text-right px-6">
                                            <span className="text-xs font-bold text-stone-400">
                                                {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(!recentOrders || recentOrders.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-10 text-stone-400 font-medium italic">
                                            No recent transactions found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            </div>
        </div>
    );
}
