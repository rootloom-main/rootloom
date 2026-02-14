import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardMetrics } from '@/components/admin/dashboard-metrics';

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

  if (profile?.role !== 'admin') {
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

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Overview of your store's performance.</p>
      </div>

      <DashboardMetrics
        totalRevenue={totalRevenue}
        totalOrders={totalOrders || 0}
        pendingOrders={pendingOrders || 0}
        lowStockCount={lowStockCount || 0}
        totalCustomers={totalCustomers || 0}
      />

      {/* Recent Activity Section (Placeholder for now) */}
      <div className="mt-8 grid gap-8 grid-cols-1 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-900">Recent Orders</h3>
          </div>
          <div className="divide-y">
            {recentOrders?.map((order) => (
              <div key={order.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-medium text-sm text-gray-900">
                    Order #{order.order_number}
                  </p>
                  <p className="text-xs text-gray-500">
                    {Array.isArray(order.profiles) ? order.profiles[0]?.email : (order.profiles as any)?.email || 'Guest'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm text-gray-900">
                    ₹{order.total?.toFixed(2)}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${order.status === 'completed' || order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
            {(!recentOrders || recentOrders.length === 0) && (
              <div className="p-8 text-center text-gray-500 text-sm">
                No recent orders found.
              </div>
            )}
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-900">Recent Reviews</h3>
          </div>
          <div className="divide-y">
            {recentReviews?.map((review) => (
              <div key={review.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <p className="font-medium text-sm text-gray-900">
                      {Array.isArray(review.product) ? review.product[0]?.name : (review.product as any)?.name}
                    </p>
                    <div className="flex items-center gap-1 text-yellow-500 text-xs">
                      {'★'.repeat(review.rating)}
                      <span className="text-gray-400">
                        {'★'.repeat(5 - review.rating)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  "{review.comment}"
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    - {Array.isArray(review.profiles) ? review.profiles[0]?.full_name : (review.profiles as any)?.full_name || 'Anonymous'}
                  </span>
                </div>
              </div>
            ))}  {(!recentReviews || recentReviews.length === 0) && (
              <div className="p-8 text-center text-gray-500 text-sm">
                No recent reviews found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
