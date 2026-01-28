import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDate } from '@/lib/utils/format';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Package, MapPin, CreditCard } from 'lucide-react';
import Image from 'next/image';

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      `
      *,
      shipping_address:addresses(
        full_name,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country
      ),
      order_items(
        id,
        quantity,
        price,
        product:products(
          name,
          slug,
          product_images(image_url)
        ),
        variant:product_variants(
          size,
          color
        )
      )
    `
    )
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (error || !order) {
    notFound();
  }

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
      <Link
        href="/account/orders"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Orders
      </Link>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Order #{order.order_number}</h1>
          <p className="text-gray-600">Placed on {formatDate(order.created_at)}</p>
        </div>
        <Badge variant={getStatusColor(order.status)} className="text-lg px-4 py-2">
          {order.status.toUpperCase()}
        </Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.order_items?.map((item: any) => {
                const imageUrl =
                  item.product?.product_images?.[0]?.image_url ||
                  'https://images.pexels.com/photos/1656684/pexels-photo-1656684.jpeg?auto=compress&cs=tinysrgb&w=400';

                return (
                  <div key={item.id} className="flex gap-4 border-b pb-4 last:border-0">
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <Image
                        src={imageUrl}
                        alt={item.product?.name || 'Product'}
                        fill
                        className="object-cover rounded-md"
                      />
                    </div>
                    <div className="flex-1">
                      <Link
                        href={`/product/${item.product?.slug}`}
                        className="font-semibold hover:underline"
                      >
                        {item.product?.name}
                      </Link>
                      <p className="text-sm text-gray-600 mt-1">
                        Size: {item.variant?.size} | Color: {item.variant?.color}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {order.tracking_number && (
            <Card>
              <CardHeader>
                <CardTitle>Tracking Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Tracking Number</p>
                <p className="font-mono text-lg font-semibold">{order.tracking_number}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.shipping_address ? (
                <div className="text-gray-700 space-y-1">
                  <p className="font-semibold">{order.shipping_address.full_name}</p>
                  <p>{order.shipping_address.phone}</p>
                  <p>{order.shipping_address.address_line1}</p>
                  {order.shipping_address.address_line2 && (
                    <p>{order.shipping_address.address_line2}</p>
                  )}
                  <p>
                    {order.shipping_address.city}, {order.shipping_address.state}{' '}
                    {order.shipping_address.postal_code}
                  </p>
                  <p>{order.shipping_address.country}</p>
                </div>
              ) : (
                <p className="text-gray-500">No shipping address</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span>
                  {order.shipping_cost === 0 ? 'Free' : formatPrice(order.shipping_cost)}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-lg border-t pt-2">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
              <div className="mt-4 pt-4 border-t">
                <Badge
                  variant={
                    order.payment_status === 'completed' ? 'default' : 'destructive'
                  }
                >
                  Payment {order.payment_status}
                </Badge>
                {order.payment_id && (
                  <p className="text-xs text-gray-500 mt-2">
                    Payment ID: {order.payment_id}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
