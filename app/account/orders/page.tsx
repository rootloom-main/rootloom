import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDate } from '@/lib/utils/format';
import { Package } from 'lucide-react';

export default async function OrdersPage() {
  const supabase = await createClient();
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-slate-bark/50 mb-4" />
            <h2 className="text-2xl font-serif font-semibold mb-2 text-deep-forest">No orders yet</h2>
            <p className="text-slate-bark mb-6">When you place an order, it will appear here.</p>
            <Link href="/shop">
              <Button>Start Shopping</Button>
            </Link>
          </CardContent>
        </Card>
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
