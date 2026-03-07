import { createSSRClient } from '@/lib/utils/auth';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatDate, formatPrice } from '@/lib/utils/format';
import { Package, Truck, CreditCard, User, ExternalLink } from 'lucide-react';
import GenerateLabelButton from './generate-label-button';
import Link from 'next/link';
import { DownloadInvoiceButton } from '@/components/admin/orders/download-invoice-button';
import { OrderNotes } from '@/components/admin/orders/order-notes';
import { RefundOrderButton } from '@/components/admin/orders/refund-order-button';
import { CancelOrderButton } from '@/app/account/orders/[id]/cancel-order-button';
import { OrderStatusDropdown } from '@/components/admin/orders/order-status-dropdown';

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
    const supabase = await createSSRClient();
    const { id } = params;

    // Fetch Logic
    const { data: order } = await supabase
        .from('orders')
        .select(`
      *,
      profiles (full_name, email, phone),
      shipping_address:addresses (*),
      order_items (
        *,
        product:products (name, product_images(image_url)),
        variant:product_variants (size, color)
      )
    `)
        .eq('id', id)
        .single() as { data: any | null };

    if (!order) {
        return <div>Order not found</div>;
    }

    // Helper for status color
    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'delivered': return 'default';
            case 'shipped': return 'secondary';
            case 'processing': return 'secondary';
            case 'cancelled': return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        Order #{order.order_number}
                    </h1>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                        <span>Placed on {formatDate(order.created_at)}</span>
                        <span>•</span>
                        <OrderStatusDropdown orderId={order.id} currentStatus={order.status} />
                    </div>
                </div>
                <div className="flex gap-2">
                    <CancelOrderButton orderId={order.id} orderStatus={order.status} />
                    <RefundOrderButton
                        orderId={order.id}
                        orderTotal={order.total}
                        currentRefundStatus={order.refund_status}
                    />
                    <DownloadInvoiceButton order={order} />
                    {/* GENERATE LABEL BUTTON */}
                    <GenerateLabelButton
                        orderId={order.id}
                        disabled={!!order.tracking_number || order.status === 'cancelled' || order.status === 'delivered'}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Order Items */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Order Items</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {order.order_items.map((item: any) => (
                                    <div key={item.id} className="flex justify-between items-start">
                                        <div className="flex gap-4">
                                            {item.product?.product_images?.[0]?.image_url ? (
                                                <div className="relative h-16 w-16 rounded-md overflow-hidden border">
                                                    <Image
                                                        src={item.product.product_images[0].image_url}
                                                        alt={item.product?.name || 'Product Image'}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="h-16 w-16 bg-gray-100 rounded-md border flex items-center justify-center text-xs text-gray-400">
                                                    Img
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium">{item.product?.name || 'Product'}</p>
                                                <p className="text-sm text-gray-500">
                                                    Size: {item.variant?.size} • Color: {item.variant?.color}
                                                </p>
                                                <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                                            </div>
                                        </div>
                                        <div className="font-medium">{formatPrice(item.price)}</div>
                                    </div>
                                ))}
                            </div>
                            <Separator className="my-4" />
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Subtotal</span>
                                    <span>{formatPrice(order.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Shipping</span>
                                    <span>{formatPrice(order.shipping_cost)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg pt-2">
                                    <span>Total</span>
                                    <span>{formatPrice(order.total)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Customer & Details */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <User className="h-4 w-4" /> Customer
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-3">
                            <div>
                                <p className="font-medium">{order.profiles?.full_name || 'Guest'}</p>
                                <p className="text-gray-500">{order.profiles?.email}</p>
                                <p className="text-gray-500">{order.profiles?.phone}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Truck className="h-4 w-4" /> Shipping Address
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-3">
                            {order.shipping_address ? (
                                <>
                                    <div>
                                        <p>{order.shipping_address.address_line1}</p>
                                        {order.shipping_address.address_line2 && <p>{order.shipping_address.address_line2}</p>}
                                        <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</p>
                                        <p>{order.shipping_address.country}</p>
                                    </div>
                                    {order.tracking_number && (
                                        <div className="pt-2 border-t mt-2">
                                            <p className="text-xs text-gray-500 uppercase font-semibold">Tracking Number</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="font-mono bg-gray-100 px-2 py-1 rounded">{order.tracking_number}</p>
                                                <Link href="#" className="text-blue-600 hover:text-blue-800">
                                                    <ExternalLink className="h-4 w-4" />
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-gray-500 italic">No address provided</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <CreditCard className="h-4 w-4" /> Payment Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Badge variant={order.payment_status === 'completed' ? 'default' : 'destructive'} className="capitalize mb-2">
                                {order.payment_status}
                            </Badge>
                            {order.payment_id && (
                                <p className="text-xs text-gray-400 break-all">ID: {order.payment_id}</p>
                            )}
                        </CardContent>
                    </Card>

                    <OrderNotes orderId={order.id} initialNotes={order.notes} />
                </div>

            </div>
        </div>
    );
}
