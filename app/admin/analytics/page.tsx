import { createSSRClient } from '@/lib/utils/auth';
import { getCurrentUser } from '@/lib/utils/auth';
import { redirect } from 'next/navigation';
import { DashboardMetrics } from '@/components/admin/dashboard-metrics';
import { SalesChart } from '@/components/admin/analytics/sales-chart';
import { CategoryPieChart } from '@/components/admin/analytics/category-pie-chart';
import { SizeDemandChart } from '@/components/admin/analytics/size-demand-chart';
import { CustomerGrowthChart } from '@/components/admin/analytics/customer-growth-chart';
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
    Package
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function AdminAnalyticsPage() {
    const supabase = await createSSRClient();
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

    // 1. Fetch all orders for metrics and breakdown
    const { data: allOrders } = await supabase
        .from('orders')
        .select('total, created_at, status') as { data: any[] | null };

    const orders = allOrders?.filter(o => o.status !== 'cancelled') || [];

    // 2. Fetch order items for top products
    const { data: orderItems } = await supabase
        .from('order_items')
        .select('quantity, price, product:products(name)') as { data: any[] | null };

    // 3. Fetch Recent Orders with Customer Info
    const { data: recentOrders } = await supabase
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
    const { data: inventoryAlerts } = await supabase
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

    // Calculate Metrics
    const totalRevenue = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
    const totalOrders = orders?.length || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Status Breakdown
    const statusCounts = {
        pending: allOrders?.filter(o => o.status === 'pending').length || 0,
        shipped: allOrders?.filter(o => o.status === 'shipped').length || 0,
        delivered: allOrders?.filter(o => o.status === 'delivered').length || 0,
        cancelled: allOrders?.filter(o => o.status === 'cancelled').length || 0,
        refunded: allOrders?.filter(o => o.status === 'refunded').length || 0,
    };

    // Group Top Products
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    orderItems?.forEach((item: any) => {
        const name = item.product?.name || 'Unknown Product';
        if (!productSales[name]) {
            productSales[name] = { name, quantity: 0, revenue: 0 };
        }
        productSales[name].quantity += item.quantity;
        productSales[name].revenue += item.quantity * item.price;
    });

    const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

    // Historical Revenue (Last 30 Days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const chartData: { name: string; total: number }[] = [];

    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        chartData.push({ name: dateStr, total: 0 });
    }

    orders?.filter(o => new Date(o.created_at) >= thirtyDaysAgo).forEach(order => {
        const dateStr = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dayEntry = chartData.find(d => d.name === dateStr);
        if (dayEntry) dayEntry.total += order.total;
    });

    // Category Distribution
    const { data: categoryItems } = await supabase.from('order_items').select('quantity, price, product:products(categories(name))') as { data: any[] | null };
    const categorySales: Record<string, number> = {};
    categoryItems?.forEach((item: any) => {
        const catName = item.product?.categories?.name || 'Uncategorized';
        categorySales[catName] = (categorySales[catName] || 0) + (item.quantity * item.price);
    });
    const pieChartData = Object.entries(categorySales).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    return (
        <div className="container mx-auto px-6 py-10 space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-serif font-bold tracking-tight text-deep-forest mb-2">Command Center</h1>
                    <p className="text-slate-500 font-medium">Real-time overview of your Heirloom empire.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="border-stone-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-all">
                        <Activity className="w-4 h-4 mr-2 text-purple-600" /> Live Logs
                    </Button>
                    <Button className="bg-deep-forest hover:bg-deep-forest/90 text-white rounded-xl shadow-lg shadow-deep-forest/10 px-6">
                        Generate Report
                    </Button>
                </div>
            </div>

            {/* Primary Metrics */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Growth Revenue', value: formatPrice(totalRevenue), trend: '+12.5%', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Total Volume', value: totalOrders, trend: '+8.2%', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Order Velocity', value: formatPrice(averageOrderValue), trend: '-2.1%', icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50' },
                    { label: 'Active Sessions', value: '42', trend: 'Live', icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50' },
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
                                            <p className="text-[10px] text-stone-500 uppercase tracking-widest">Order #{order.id.slice(0, 8)}</p>
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
                                        #{order.id.slice(0, 8).toUpperCase()}
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
    );
}
