'use client';

import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils/format';
import { ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PriceDetailsProps {
    cart: any[];
    subtotal: number;
    shipping: number;
    total: number;
    itemCount: number;
}

export function PriceDetails({ cart, subtotal, shipping, total, itemCount }: PriceDetailsProps) {
    const router = useRouter();

    // Calculate savings using base price vs actual price if you had separate fields
    // For now, we'll simulate it or just show the total
    const totalMrp = subtotal; // Placeholder if you add MRP field later
    const discount = 0; // Placeholder

    return (
        <div className="bg-white rounded-sm shadow-sm border border-stone-200 sticky top-24">
            <div className="p-4 border-b border-stone-100">
                <h2 className="text-gray-500 font-semibold uppercase text-sm tracking-wide">
                    Price Details
                </h2>
            </div>

            <div className="p-4 space-y-4">
                <div className="flex justify-between text-deep-forest">
                    <span>Price ({itemCount} items)</span>
                    <span>{formatPrice(totalMrp)}</span>
                </div>

                {discount > 0 && (
                    <div className="flex justify-between text-deep-forest">
                        <span>Discount</span>
                        <span className="text-green-600">-{formatPrice(discount)}</span>
                    </div>
                )}

                <div className="flex justify-between text-deep-forest border-b border-dashed border-stone-200 pb-4">
                    <span>Delivery Charges</span>
                    <span className="text-green-600">
                        {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                    </span>
                </div>

                <div className="flex justify-between text-lg font-bold text-deep-forest pt-2">
                    <span>Total Amount</span>
                    <span>{formatPrice(total)}</span>
                </div>

                {discount > 0 && (
                    <div className="text-green-600 font-medium text-sm pt-2 border-t border-stone-100 mt-2">
                        You will save {formatPrice(discount)} on this order
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-stone-100 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 justify-center">
                    <ShieldCheck className="h-4 w-4 text-slate-400" />
                    Safe and Secure Payments. 100% Authentic products.
                </div>

                {/* Helper for Desktop */}
                <Button
                    className="w-full h-12 text-base uppercase font-semibold bg-deep-forest hover:bg-deep-forest/90 hidden lg:flex"
                    onClick={() => router.push('/checkout')}
                >
                    Place Order
                </Button>
            </div>
        </div>
    );
}
