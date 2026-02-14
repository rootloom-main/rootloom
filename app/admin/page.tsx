import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardMetrics } from '@/components/admin/dashboard-metrics';
import { AdminCharts } from '@/components/admin/admin-charts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
// import { CalendarDateRangePicker } from '@/components/date-range-picker'; 
import { Download, Calendar as CalendarIcon } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Double check admin role (redundant with layout but safe)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
    redirect('/');
  }

  // 1. Fetch Total Revenue (All non-cancelled and non-failed orders)
  const { data: revenueData } = await supabase
    .from('orders')
    .select('total')
    .neq('status', 'cancelled')
    .neq('payment_status', 'failed');

  const totalRevenue = revenueData?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;

  // 2. Fetch Order Counts
  const { count: totalOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });

  const { count: pendingOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  // 3. Fetch Customer Count
  const { count: totalCustomers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  // 4. Fetch Low Stock Variants (< 5 items)
  const { count: lowStockCount } = await supabase
    .from('product_variants')
    .select('*', { count: 'exact', head: true })
    .lt('stock', 5);

  // 5. Fetch Recent Orders (Limit 5)
  const { data: recentOrders } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      total,
      status,
      created_at,
      payment_status,
      profiles (email, full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  // 6. Fetch Recent Reviews (Limit 5)
  const { data: recentReviews } = await supabase
    .from('reviews')
    .select(`
      id,
      rating,
      comment,
      created_at,
      product:products(name, slug),
      profiles(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  // 7. Fetch All Orders for Charts (Last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: allOrders } = await supabase
    .from('orders')
    .select('created_at, total')
    .gte('created_at', sixMonthsAgo.toISOString())
    .neq('status', 'cancelled')
    .neq('payment_status', 'failed')
    .order('created_at', { ascending: true });

  // 8. Fetch All Customers for Charts (Last 6 months)
  const { data: allCustomers } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', sixMonthsAgo.toISOString())
    .order('created_at', { ascending: true });

  // Aggregate Data for Charts
  const getMonthName = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('default', { month: 'short' });
  };

  const aggregateRevenue = () => {
    const monthlyRevenue: { [key: string]: number } = {};

    allOrders?.forEach(order => {
      const month = getMonthName(order.created_at);
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (order.total || 0);
    });

    return Object.entries(monthlyRevenue).map(([name, revenue]) => ({ name, revenue }));
  };

  const aggregateCustomers = () => {
    const monthlyCustomers: { [key: string]: number } = {};

    allCustomers?.forEach(customer => {
      const month = getMonthName(customer.created_at);
      monthlyCustomers[month] = (monthlyCustomers[month] || 0) + 1;
    });

    return Object.entries(monthlyCustomers).map(([name, customers]) => ({ name, customers }));
  };

  const revenueChartData = aggregateRevenue();
  const customerChartData = aggregateCustomers();

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 bg-slate-50/50 min-h-screen">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h2>
          <p className="text-slate-500">Overview of your store's performance.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="h-9 bg-white border-slate-200 text-slate-700">
            <CalendarIcon className="mr-2 h-4 w-4" />
            Last 30 Days
          </Button>
          <Button className="h-9 bg-slate-900 hover:bg-slate-800 text-white">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <DashboardMetrics
          totalRevenue={totalRevenue}
          totalOrders={totalOrders || 0}
          pendingOrders={pendingOrders || 0}
          lowStockCount={lowStockCount || 0}
          totalCustomers={totalCustomers || 0}
        />
      </div>

      <div className="space-y-4">
        <AdminCharts revenueData={revenueChartData} customerData={customerChartData} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Orders Table */}
        <div className="col-span-4 bg-white rounded-xl border border-stone-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Recent Orders</h3>
              <p className="text-sm text-slate-500">Latest transactions from your store.</p>
            </div>
            <Button variant="ghost" size="sm" className="text-slate-500 text-xs">View All</Button>
          </div>
          <div className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[100px]">Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders?.map((order) => (
                  <TableRow key={order.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium text-slate-900">#{order.order_number}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">
                          {Array.isArray(order.profiles) ? order.profiles[0]?.full_name || 'Guest' : (order.profiles as any)?.full_name || 'Guest'}

                        </span>
                        <span className="text-xs text-slate-500">
                          {Array.isArray(order.profiles) ? order.profiles[0]?.email : (order.profiles as any)?.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={
                        order.status === 'completed' || order.status === 'delivered' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                          order.status === 'cancelled' || order.status === 'failed' ? 'bg-red-100 text-red-700 hover:bg-red-100' :
                            'bg-amber-100 text-amber-700 hover:bg-amber-100'
                      }>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">₹{order.total?.toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                ))}
                {(!recentOrders || recentOrders.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">No orders found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Recent Reviews List */}
        <div className="col-span-3 bg-white rounded-xl border border-stone-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100">
            <h3 className="font-semibold text-slate-900">Recent Reviews</h3>
            <p className="text-sm text-slate-500">What customers are saying.</p>
          </div>
          <div className="p-6 space-y-6">
            {recentReviews?.map((review) => (
              <div key={review.id} className="flex gap-4">
                <Avatar className="h-9 w-9 border border-stone-100">
                  <AvatarFallback className="bg-purple-50 text-purple-600 text-xs font-medium">
                    {((Array.isArray(review.profiles) ? review.profiles[0]?.full_name : (review.profiles as any)?.full_name) || 'A')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      {Array.isArray(review.profiles) ? review.profiles[0]?.full_name : (review.profiles as any)?.full_name || 'Anonymous'}
                    </span>
                    <span className="text-xs text-slate-400">• {new Date(review.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex text-amber-400 h-3">
                    {'★'.repeat(review.rating)}
                    <span className="text-stone-200">{'★'.repeat(5 - review.rating)}</span>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2">
                    {review.comment}
                  </p>
                  <p className="text-xs text-slate-400 font-medium">
                    On {Array.isArray(review.product) ? review.product[0]?.name : (review.product as any)?.name}
                  </p>
                </div>
              </div>
            ))}
            {(!recentReviews || recentReviews.length === 0) && (
              <div className="text-center py-8 text-slate-500 text-sm">No recent reviews.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
