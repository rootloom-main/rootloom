'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Package, ExternalLink } from 'lucide-react';

export default function CheckoutSuccessPage() {
    const [orderNumber, setOrderNumber] = useState<string | null>(null);
    const [date, setDate] = useState<string>('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setOrderNumber(params.get('orderNumber') || `ORD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`);

        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 5);
        setDate(deliveryDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    }, []);

    // Prevent hydration mismatch
    if (!orderNumber) return null;

    return (
        <div className="min-h-screen bg-stone-100 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Success Card (Utilitarian layout matching Amazon) */}
                <div className="bg-white border-t-8 border-green-600 shadow-sm rounded-sm overflow-hidden">
                    <div className="p-8 md:p-10 border-b border-stone-100 flex flex-col md:flex-row items-start md:items-center gap-6">
                        <CheckCircle2 className="h-16 w-16 text-green-600 flex-shrink-0" />
                        <div>
                            <h1 className="text-2xl font-bold text-stone-900 mb-2">Order placed, thank you!</h1>
                            <p className="text-stone-600 font-medium tracking-wide">Confirmation will be sent to your registered email address.</p>
                        </div>
                    </div>

                    <div className="p-8 md:p-10 grid md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6">Order Details</h3>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-1.5">Order Number</p>
                                    <p className="text-lg font-bold text-stone-900">{orderNumber}</p>
                                </div>
                                <div className="pt-4 border-t border-stone-100">
                                    <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-1.5">Estimated Delivery</p>
                                    <p className="text-lg font-bold text-deep-forest">{date}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-stone-50 p-6 rounded border border-stone-100 flex flex-col justify-center">
                            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">What's Next?</h3>
                            <ul className="space-y-4 text-sm font-medium text-stone-600 leading-relaxed">
                                <li className="flex items-start gap-3">
                                    <Package className="h-5 w-5 text-stone-400 flex-shrink-0" />
                                    <span>Track your shipment status and location from the Your Orders panel.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <ExternalLink className="h-5 w-5 text-stone-400 flex-shrink-0" />
                                    <span>You can cancel or modify your items before the package ships.</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="p-8 md:p-10 bg-stone-50/50 border-t border-stone-100 flex flex-col sm:flex-row gap-4">
                        <Link href="/account/orders" className="flex-1">
                            <Button className="w-full h-12 bg-white text-stone-900 border-2 border-stone-200 hover:bg-stone-50 hover:border-stone-300 font-bold tracking-wide shadow-sm rounded-sm">
                                REVIEW OR EDIT ORDERS
                            </Button>
                        </Link>
                        <Link href="/shop" className="flex-1">
                            <Button className="w-full h-12 bg-[#FB641B] hover:bg-[#FB641B]/90 text-white font-bold tracking-wide rounded-sm shadow-md">
                                CONTINUE SHOPPING
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
