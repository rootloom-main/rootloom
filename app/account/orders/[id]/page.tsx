import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/utils/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDate } from '@/lib/utils/format';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Package, MapPin, CreditCard, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { CancelOrderButton } from './cancel-order-button';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: order } = (await supabase
    .from('orders')
    .select(
      `
      *,
      delivered_at,
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
        ),
        returns(*)
      )
    `
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .single()) as { data: any | null };

  if (!order) {
    notFound();
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'processing': return 'default';
      case 'shipped': return 'default';
      case 'delivered': return 'default';
      case 'cancelled': return 'destructive';
      case 'returned': return 'destructive';
      default: return 'default';
    }
  };

  const getReturnStatusColor = (status: string) => {
    switch (status) {
      case 'requested': return 'secondary';
      case 'approved': return 'default';
      case 'picked_up': return 'default';
      case 'refund_processed': return 'default';
      case 'rejected': return 'destructive';
      default: return 'default';
    }
  };

  // Return Eligibility Logic (7 Days)
  let isReturnEligible = false;
  let returnDeadline = null;
  let returnExpired = false;

  if (order.status === 'delivered' && order.delivered_at) {
    const deliveryDate = new Date(order.delivered_at);
    returnDeadline = new Date(deliveryDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const currentDate = new Date();

    if (currentDate <= returnDeadline) {
      isReturnEligible = true;
    } else {
      returnExpired = true;
    }
  }

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
                      <div className="flex justify-between items-start">
                        <Link
                          href={`/product/${item.product?.slug}`}
                          className="font-semibold hover:underline"
                        >
                          {item.product?.name}
                        </Link>
                        {item.returns?.[0] && (
                           <Badge variant={getReturnStatusColor(item.returns[0].status)} className="capitalize">
                             {item.returns[0].status.replace(/_/g, ' ')}
                           </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Size: {item.variant?.size} | Color: {item.variant?.color}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                      
                      {item.returns?.[0] && (
                        <div className="mt-4 p-3 bg-stone-50 border border-stone-100 rounded-lg">
                          <p className="text-xs font-bold text-deep-forest uppercase tracking-wider mb-1">Return Update</p>
                          <p className="text-sm text-stone-600">
                             {item.returns[0].status === 'requested' && "We've received your request and are reviewing it."}
                             {item.returns[0].status === 'approved' && "Return approved. We'll schedule a pickup soon."}
                             {item.returns[0].status === 'pickup_scheduled' && `Pickup scheduled. ID: ${item.returns[0].pickup_tracking_id || 'Pending'}`}
                             {item.returns[0].status === 'refund_processed' && "Refund has been initiated to your account."}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {order.status !== 'delivered' && order.status !== 'cancelled' && (
            <div className="flex justify-end gap-3 mt-4">
              {order.payment_status !== 'completed' && (
                <Button asChild className="bg-deep-forest hover:bg-deep-forest/90 text-white font-bold rounded-xl h-11 px-6 shadow-md">
                  <Link href={`/checkout?order_id=${order.id}`}>
                    Retry Payment
                  </Link>
                </Button>
              )}
              <CancelOrderButton orderId={order.id} orderStatus={order.status} />
            </div>
          )}


          {/* Return Eligibility Section */}
          {order.status === 'delivered' && (
            <div className="mt-6 border border-stone-100 rounded-xl p-6 bg-stone-50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-deep-forest flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Order Delivered
                </h3>
                {isReturnEligible && returnDeadline && (
                  <p className="text-sm text-green-700 mt-1">
                    Return eligible until {formatDate(returnDeadline.toISOString())}
                  </p>
                )}
                {(order.refund_status === 'processed' || order.refund_status === 'requested') && (
                  <p className="text-sm text-red-600 mt-1 font-semibold italic">
                    This order has been processed for a refund.
                  </p>
                )}
                {returnExpired && !order.refund_status && (
                  <p className="text-sm text-stone-500 mt-1">
                    The return window for this order has expired.
                  </p>
                )}
              </div>

              {isReturnEligible && 
               order.refund_status !== 'processed' && 
               order.refund_status !== 'requested' &&
               !order.order_items.some((item: any) => item.returns && item.returns.length > 0) && (
                <Link href={`/account/orders/${order.id}/return`}>
                  <Button className="bg-deep-forest hover:bg-deep-forest/90 text-white font-bold rounded-xl whitespace-nowrap">
                    Request Return / Exchange
                  </Button>
                </Link>
              )}
              {(order.order_items.some((item: any) => item.returns && item.returns.length > 0) || order.refund_status === 'processed') && (
                <div className="px-4 py-2 bg-deep-forest/5 text-deep-forest font-bold rounded-xl text-sm italic">
                  {order.refund_status === 'processed' ? 'Return / Refund Completed' : 'Return request in progress'}
                </div>
              )}
            </div>
          )}
          {(order.tracking_number || order.tracking_url) && (
            <Card>
              <CardHeader>
                <CardTitle>Tracking Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.tracking_number && (
                  <div>
                    <p className="text-gray-600 mb-1">Tracking ID</p>
                    <p className="font-mono text-lg font-semibold break-all">{order.tracking_number}</p>
                  </div>
                )}
                {order.tracking_url && (
                  <div>
                    <p className="text-gray-600 mb-1">Tracking Link</p>
                    <a
                    href={order.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-semibold break-all flex items-center gap-1.5 mt-1"
                  >
                    Track Package <ExternalLink className="h-4 w-4" />
                  </a>
                  </div>
                )}
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
                    order.payment_status === 'completed'
                      ? 'default'
                      : order.payment_status === 'pending'
                        ? 'secondary'
                        : 'destructive'
                  }
                >
                  Payment {order.payment_status}
                </Badge>
                {order.refund_status && order.refund_status !== 'none' && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg">
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Refund Status</p>
                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className="text-red-700 border-red-200 bg-white capitalize">
                        {order.refund_status}
                      </Badge>
                      {(order.refund_amount || 0) > 0 && (
                        <span className="font-bold text-red-700">{formatPrice(order.refund_amount)}</span>
                      )}
                    </div>
                  </div>
                )}
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
