import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Package, ExternalLink } from 'lucide-react';
import { SuccessAnalytics } from './success-analytics';

export default async function CheckoutSuccessPage({
    searchParams,
}: {
    searchParams: Promise<{ orderNumber?: string; recovered_via?: string; retry_count?: string }>;
}) {
    const resolvedSearchParams = await searchParams;
    const orderNumber = resolvedSearchParams.orderNumber;

    if (!orderNumber) {
        redirect('/account/orders');
    }

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 5);
    const date = deliveryDate.toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    return (
        <div className="min-h-screen bg-stone-100 px-4 py-12">
            <SuccessAnalytics
                recoveredVia={resolvedSearchParams.recovered_via}
                retryCount={resolvedSearchParams.retry_count}
            />
            <div className="mx-auto max-w-3xl">
                <div className="overflow-hidden rounded-sm border-t-8 border-green-600 bg-white shadow-sm">
                    <div className="flex flex-col items-start gap-6 border-b border-stone-100 p-8 md:flex-row md:items-center md:p-10">
                        <CheckCircle2 className="h-16 w-16 flex-shrink-0 text-green-600" />
                        <div>
                            <h1 className="mb-2 text-2xl font-bold text-stone-900">Order placed, thank you!</h1>
                            <p className="font-medium tracking-wide text-stone-600">
                                Confirmation will be sent to your registered email address.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-8 p-8 md:grid-cols-2 md:p-10">
                        <div>
                            <h3 className="mb-6 text-xs font-bold uppercase tracking-widest text-stone-400">Order Details</h3>
                            <div className="space-y-6">
                                <div>
                                    <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-stone-500">Order Number</p>
                                    <p className="text-lg font-bold text-stone-900">{orderNumber}</p>
                                </div>
                                <div className="border-t border-stone-100 pt-4">
                                    <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-stone-500">Estimated Delivery</p>
                                    <p className="text-lg font-bold text-deep-forest">{date}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col justify-center rounded border border-stone-100 bg-stone-50 p-6">
                            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-stone-400">What&apos;s Next?</h3>
                            <ul className="space-y-4 text-sm font-medium leading-relaxed text-stone-600">
                                <li className="flex items-start gap-3">
                                    <Package className="h-5 w-5 flex-shrink-0 text-stone-400" />
                                    <span>Track your shipment status and location from the Your Orders panel.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <ExternalLink className="h-5 w-5 flex-shrink-0 text-stone-400" />
                                    <span>You can cancel or modify your items before the package ships.</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 border-t border-stone-100 bg-stone-50/50 p-8 sm:flex-row md:p-10">
                        <Link href="/account/orders" className="flex-1">
                            <Button className="h-12 w-full rounded-sm border-2 border-stone-200 bg-white font-bold tracking-wide text-stone-900 shadow-sm hover:border-stone-300 hover:bg-stone-50">
                                REVIEW OR EDIT ORDERS
                            </Button>
                        </Link>
                        <Link href="/shop" className="flex-1">
                            <Button className="h-12 w-full rounded-sm bg-[#FB641B] font-bold tracking-wide text-white shadow-md hover:bg-[#FB641B]/90">
                                CONTINUE SHOPPING
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
