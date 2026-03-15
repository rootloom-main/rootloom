import { redirect } from 'next/navigation';
import { createSSRClient } from '@/lib/utils/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDate } from '@/lib/utils/format';
import { Package, ChevronRight } from 'lucide-react';
import Image from 'next/image';

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
        product:products(
          name, 
          slug,
          product_images(image_url)
        )
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
          {orders.map((order: any) => {
            // Get up to 3 unique images from order items
            const orderImages = order.order_items
              ?.flatMap((item: any) => item.product?.product_images?.[0]?.image_url)
              .filter(Boolean)
              .slice(0, 3) || [];

            return (
              <Card key={order.id} className="overflow-hidden hover:border-deep-forest/30 transition-colors">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Images Section */}
                    <div className="bg-stone-50 p-6 md:w-1/3 flex items-center gap-3 border-b md:border-b-0 md:border-r border-stone-100">
                      {orderImages.length > 0 ? (
                        <div className="flex -space-x-4">
                          {orderImages.map((img: string, i: number) => (
                            <div key={i} className="relative h-16 w-16 rounded-lg border-2 border-white shadow-sm overflow-hidden bg-white">
                              <Image src={img} alt="Product" fill className="object-cover" />
                            </div>
                          ))}
                          {order.order_items?.length > 3 && (
                            <div className="relative h-16 w-16 rounded-lg border-2 border-white shadow-sm bg-stone-100 flex items-center justify-center -ml-4 z-10 text-xs font-bold text-stone-500">
                              +{order.order_items.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-stone-200 flex items-center justify-center">
                          <Package className="h-6 w-6 text-stone-400" />
                        </div>
                      )}
                    </div>

                    {/* Details Section */}
                    <div className="p-6 md:w-2/3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg text-deep-forest">
                            Order #{order.order_number}
                          </h3>
                          <Badge variant={getStatusColor(order.status)} className="uppercase text-[10px] tracking-wider font-bold">
                            {order.status}
                          </Badge>
                          {order.refund_status === 'processed' && (
                            <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 uppercase text-[10px] tracking-wider font-bold">
                              Refunded
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap text-sm text-stone-500 gap-x-4 gap-y-1">
                          <p>Placed on {formatDate(order.created_at)}</p>
                          <p className="hidden sm:block">•</p>
                          <p>{order.order_items?.length} item(s)</p>
                          <p className="hidden sm:block">•</p>
                          <p className="font-semibold text-deep-forest">{formatPrice(order.total)}</p>
                        </div>
                      </div>
                      <Link href={`/account/orders/${order.id}`} className="block mt-2 sm:mt-0">
                        <Button variant="outline" className="w-full sm:w-auto h-10 px-6 rounded-xl border-stone-200 text-deep-forest hover:bg-stone-50 group">
                          Details
                          <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
