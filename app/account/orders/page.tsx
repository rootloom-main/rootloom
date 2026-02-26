import { redirect } from 'next/navigation';
import { createSSRClient } from '@/lib/utils/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDate } from '@/lib/utils/format';
import { Package } from 'lucide-react';

export default async function OrdersPage() {
  const supabase = await createSSRClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: orders } = await supabase
    .from('orders')
    .select(
      `
      *,
      order_items(
        id,
        quantity,
        price,
        product:products(name, slug)
      )
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'processing':
        return 'default';
      case 'shipped':
        return 'default';
      case 'delivered':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>

      {!orders || orders.length === 0 ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center py-20 bg-stone-50/50 rounded-xl border border-dashed border-stone-200">
          <div className="w-20 h-20 bg-heirloom-white rounded-full flex items-center justify-center mb-6">
            <Package className="h-8 w-8 text-stone-400" />
          </div>
          <h2 className="text-2xl font-serif font-medium text-deep-forest mb-3">No orders yet</h2>
          <p className="text-slate-500 max-w-md mb-8">
            Once you place your first order, you&apos;ll be able to track it here.
          </p>
          <Link href="/shop">
            <Button size="lg" className="rounded-full px-8 bg-deep-forest hover:bg-deep-forest/90">
              Start Shopping
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <Card key={order.id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">
                        Order #{order.order_number}
                      </h3>
                      <Badge variant={getStatusColor(order.status)}>
                        {order.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Placed on {formatDate(order.created_at)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {order.order_items?.length} item(s) • {formatPrice(order.total)}
                    </p>
                    {order.tracking_number && (
                      <p className="text-sm text-gray-600">
                        Tracking: <span className="font-mono">{order.tracking_number}</span>
                      </p>
                    )}
                  </div>
                  <Link href={`/account/orders/${order.id}`}>
                    <Button variant="outline">View Details</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
