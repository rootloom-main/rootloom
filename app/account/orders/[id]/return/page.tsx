import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/utils/auth';
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
import { ReturnForm } from '@/components/account/return-form';

export default async function ReturnRequestPage({
    params,
}: {
    params: { id: string };
}) {
    const supabase = await createClient();
    const { id } = params;

    const user = await getCurrentUser();

    if (!user) {
        redirect('/auth/login');
    }

    // Fetch order with items
    const { data: order } = await supabase
        .from('orders')
        .select(`
      *,
      order_items (
        *,
        product:products (*),
        variant:product_variants (*)
      )
    `)
        .eq('id', id)
        .eq('user_id', user.id)
        .single() as { data: any | null };

    if (!order) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="text-2xl font-bold mb-4">Order not found</h1>
                <Link href="/account/orders">
                    <Button>Back to Orders</Button>
                </Link>
            </div>
        );
    }

    // Calculate return eligibility (e.g. within 30 days)
    const orderDate = new Date(order.created_at);
    const daysSinceOrder = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
    const isEligible = daysSinceOrder <= 30 && order.status === 'delivered';

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl font-sans">
            <Link
                href={`/account/orders/${id}`}
                className="inline-flex items-center text-sm font-medium text-stone-500 hover:text-deep-forest mb-6 transition-colors"
            >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Order
            </Link>

            <Card className="border-stone-200 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-stone-50 border-b border-stone-100">
                    <CardTitle className="font-serif text-2xl text-deep-forest">Request a Return</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    {!isEligible ? (
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-xl space-y-2">
                            <p className="font-bold">Not eligible for return.</p>
                            <p className="text-sm opacity-90">
                                {order.status !== 'delivered'
                                    ? 'Order has not been delivered yet. Returns can only be requested after delivery.'
                                    : `Return window closed (${daysSinceOrder} days since delivery). Returns are only valid within 30 days of delivery.`}
                            </p>
                        </div>
                    ) : (
                        <ReturnForm order={order} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
