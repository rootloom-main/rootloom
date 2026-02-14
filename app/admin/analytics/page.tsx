import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardMetrics } from '@/components/admin/dashboard-metrics';
import { SalesChart } from '@/components/admin/analytics/sales-chart';
import { CategoryPieChart } from '@/components/admin/analytics/category-pie-chart';
import { SizeDemandChart } from '@/components/admin/analytics/size-demand-chart';
import { CustomerGrowthChart } from '@/components/admin/analytics/customer-growth-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatPrice } from '@/lib/utils/format';

export default async function AdminAnalyticsPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect('/auth/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        redirect('/');
    }

    // Reuse existing logic for headers via DashboardMetrics if we want, 
    // but let's fetch specific analytics data here.

    // 1. Fetch all completed orders for revenue calc
    const { data: orders } = await supabase
        .from('orders')
        .select('total, created_at, status')
        .neq('status', 'cancelled');

    // 2. Fetch order items for top products
    const { data: orderItems } = await supabase
        .from('order_items')
        .select('quantity, price, product:products(name)');

    // Calculate Metrics
    const totalRevenue = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
    const totalOrders = orders?.length || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

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

    // 3. Fetch orders for the last 30 days for the chart
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: historicalOrders } = await supabase
        .from('orders')
        .select('total, created_at')
        .neq('status', 'cancelled')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

    // Aggregate daily revenue
    const dailyRevenue: Record<string, number> = {};
    const chartData: { name: string; total: number }[] = [];

    // Initialize last 30 days with 0
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dailyRevenue[dateStr] = 0;
        chartData.push({ name: dateStr, total: 0 }); // Placeholder order
    }

    historicalOrders?.forEach(order => {
        const date = new Date(order.created_at);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        // Use a map for O(1) lookups if we wanted, but array find is fine for 30 items
        const dayEntry = chartData.find(d => d.name === dateStr);
        if (dayEntry) {
            dayEntry.total += order.total;
        }
    });

    // 4. Fetch Category Data
    const { data: categoryItems } = await supabase
        .from('order_items')
        .select(`
            quantity,
            price,
            product:products(
                categories(name)
            )
        `);

    const categorySales: Record<string, number> = {};
    categoryItems?.forEach((item: any) => {
        const categoryName = item.product?.categories?.name || 'Uncategorized';
        if (!categorySales[categoryName]) {
            categorySales[categoryName] = 0;
        }
        categorySales[categoryName] += item.quantity * item.price;
    });

    const pieChartData = Object.entries(categorySales).map(([name, value]) => ({
        name,
        value,
    })).sort((a, b) => b.value - a.value);

    // 5. Fetch Total Returns
    const { count: totalReturns } = await supabase
        .from('returns')
        .select('*', { count: 'exact', head: true });

    // 6. Fetch Size Demand Data
    const { data: sizeOrderItems } = await supabase
        .from('order_items')
        .select(`
            quantity,
            variant:product_variants!inner(size)
        `);

    const sizeDataMap = new Map<string, number>();
    sizeOrderItems?.forEach(item => {
        // @ts-ignore - Supabase type inference for nested joins can be tricky
        const size = item.variant?.size;
        if (size) {
            sizeDataMap.set(size, (sizeDataMap.get(size) || 0) + item.quantity);
        }
    });

    // Sort sizes logically (S, M, L, XL...)
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    const sizeData = Array.from(sizeDataMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => {
            const indexA = sizeOrder.indexOf(a.name);
            const indexB = sizeOrder.indexOf(b.name);
            return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
        });

    // 7. Fetch Customer Growth (Last 30 days)
    const customerThirtyDaysAgo = new Date();
    customerThirtyDaysAgo.setDate(customerThirtyDaysAgo.getDate() - 30);

    const { data: profiles } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', customerThirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

    const customerGrowthData: { date: string; count: number }[] = [];

    // Initialize last 30 days with 0
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD format
        customerGrowthData.push({ date: dateStr, count: 0 });
    }

    profiles?.forEach(profile => {
        const dateStr = new Date(profile.created_at).toISOString().split('T')[0];
        const dayEntry = customerGrowthData.find(d => d.date === dateStr);
        if (dayEntry) {
            dayEntry.count += 1;
        }
    });

    return (
        <div className="container mx-auto px-6 py-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">Analytics Dashboard</h1>

            {/* Overview Cards */}
            <div className="grid gap-4 md:grid-cols-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatPrice(totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground">Lifetime earnings</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalOrders}</div>
                        <p className="text-xs text-muted-foreground">Successful orders</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatPrice(averageOrderValue)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Returns</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalReturns || 0}</div>
                        <p className="text-xs text-muted-foreground">Total return requests</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mb-8">
                <SalesChart data={chartData} />
                <CategoryPieChart data={pieChartData} />
            </div>

            {/* Top Products Table */}
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Top Selling Products</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product Name</TableHead>
                                <TableHead className="text-right">Units Sold</TableHead>
                                <TableHead className="text-right">Revenue Generated</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {topProducts.map((product) => (
                                <TableRow key={product.name}>
                                    <TableCell className="font-medium">{product.name}</TableCell>
                                    <TableCell className="text-right">{product.quantity}</TableCell>
                                    <TableCell className="text-right">{formatPrice(product.revenue)}</TableCell>
                                </TableRow>
                            ))}
                            {topProducts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                                        No sales data yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
