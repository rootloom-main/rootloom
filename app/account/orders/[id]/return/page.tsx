import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/utils/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { ReturnForm } from '@/components/account/return-form';
import { RETURN_WINDOW_DAYS, getReturnDeadline, isReturnEligible } from '@/lib/returns/policy';

export default async function ReturnRequestPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const supabase = await createClient();
    const { id } = await params;

    const user = await getCurrentUser();
    if (!user) {
        redirect('/auth/login');
    }

    const { data: order } = await (supabase
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
        .single() as unknown as { data: any | null });

    if (!order) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="mb-4 text-2xl font-bold">Order not found</h1>
                <Link href="/account/orders">
                    <Button>Back to Orders</Button>
                </Link>
            </div>
        );
    }

    const deadline = order.delivered_at ? getReturnDeadline(order.delivered_at) : null;
    const eligible = order.status === 'delivered' && isReturnEligible(order.delivered_at);
    const daysSinceDelivery = order.delivered_at
        ? Math.floor((Date.now() - new Date(order.delivered_at).getTime()) / (1000 * 60 * 60 * 24))
        : null;

    return (
        <div className="container mx-auto max-w-2xl px-4 py-8 font-sans">
            <Link
                href={`/account/orders/${id}`}
                className="mb-6 inline-flex items-center text-sm font-medium text-stone-500 transition-colors hover:text-deep-forest"
            >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back to Order
            </Link>

            <Card className="overflow-hidden rounded-2xl border-stone-200 shadow-xl">
                <CardHeader className="border-b border-stone-100 bg-stone-50">
                    <CardTitle className="font-serif text-2xl text-deep-forest">Request a Return</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    {!eligible ? (
                        <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
                            <p className="font-bold">Not eligible for return.</p>
                            <p className="text-sm opacity-90">
                                {order.status !== 'delivered'
                                    ? 'Order has not been delivered yet. Returns can only be requested after delivery.'
                                    : `Return window closed${daysSinceDelivery !== null ? ` (${daysSinceDelivery} days since delivery)` : ''}. Returns are only valid within ${RETURN_WINDOW_DAYS} days of delivery.`}
                            </p>
                        </div>
                    ) : (
                        <>
                            {deadline && (
                                <p className="mb-6 text-sm text-stone-500">
                                    Return window closes on {deadline.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}.
                                </p>
                            )}
                            <ReturnForm order={order} />
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
