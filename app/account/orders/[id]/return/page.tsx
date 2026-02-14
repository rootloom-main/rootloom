import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatDate, formatPrice } from '@/lib/utils/format';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default async function ReturnRequestPage({
    params,
}: {
    params: { id: string };
}) {
    const supabase = await createClient();
    const { id } = params;

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/login');
    }

    // Fetch order with items
    const { data: order } = await supabase
        .from('orders')
        .select(`
      *,
      order_items (
        id,
        quantity,
        price,
        product:products (name, image_url),
        variant:product_variants (size, color)
      )
    `)
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (!order) {
        notFound();
    }

    // Calculate return eligibility (e.g. within 30 days)
    const orderDate = new Date(order.created_at);
    const daysSinceOrder = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
    const isEligible = daysSinceOrder <= 30 && order.status === 'delivered';

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <Link
                href={`/account/orders/${id}`}
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
            >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Order
            </Link>

            <Card>
                <CardHeader>
                    <CardTitle>Request a Return</CardTitle>
                </CardHeader>
                <CardContent>
                    {!isEligible ? (
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md">
                            <p className="font-medium">Not eligible for return.</p>
                            <p className="text-sm mt-1">
                                {order.status !== 'delivered'
                                    ? 'Order has not been delivered yet.'
                                    : `Return window closed (${daysSinceOrder} days since order). Returns valid for 30 days.`}
                            </p>
                        </div>
                    ) : (
                        <form action="/api/user/returns" method="POST" className="space-y-6">
                            <input type="hidden" name="orderId" value={order.id} />

                            <div className="space-y-4">
                                <Label>Select Item(s) to Return</Label>
                                {order.order_items.map((item: any) => (
                                    <div key={item.id} className="flex items-start gap-3 p-3 border rounded-md">
                                        <input
                                            type="radio"
                                            name="orderItemId"
                                            value={item.id}
                                            id={`item-${item.id}`}
                                            required
                                            className="mt-1"
                                        />
                                        <label htmlFor={`item-${item.id}`} className="flex-1 cursor-pointer">
                                            <div className="flex justify-between">
                                                <span className="font-medium">{item.product?.name}</span>
                                                <span>{formatPrice(item.price)}</span>
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                Size: {item.variant?.size}, Color: {item.variant?.color} • Qty: {item.quantity}
                                            </p>
                                        </label>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reason">Reason for Return</Label>
                                <Select name="reason" required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a reason" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="wrong_size">Wrong Size</SelectItem>
                                        <SelectItem value="damaged">Damaged / Defective</SelectItem>
                                        <SelectItem value="not_as_described">Not as Described</SelectItem>
                                        <SelectItem value="changed_mind">Changed Mind</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="comments">Additional Comments (Optional)</Label>
                                <Textarea
                                    name="comments"
                                    id="comments"
                                    placeholder="Please provide more details..."
                                    rows={3}
                                />
                            </div>

                            <Button type="submit" className="w-full">
                                Submit Return Request
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
