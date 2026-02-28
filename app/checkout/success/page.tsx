'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Package, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CheckoutSuccessPage() {
    const [orderNumber, setOrderNumber] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setOrderNumber(params.get('orderNumber'));
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-20 bg-stone-50/30">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="max-w-xl w-full"
            >
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 text-deep-forest bg-deep-forest/5 px-4 py-2 rounded-full border border-deep-forest/10 mb-6"
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Payment Received</span>
                    </motion.div>
                    <h1 className="text-5xl font-serif font-bold text-stone-900 mb-4">
                        Thank You.
                    </h1>
                    <p className="text-stone-500 font-medium max-w-sm mx-auto leading-relaxed">
                        Your order has been confirmed and is now being handcrafted for your delivery.
                    </p>
                </div>

                <Card className="border-none shadow-2xl bg-white rounded-[2rem] overflow-hidden">
                    <CardContent className="p-10 text-center">
                        {orderNumber && (
                            <div className="mb-10 text-left">
                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-4">Order Confirmation</p>
                                <div className="bg-stone-50 rounded-2xl p-6 border border-stone-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-stone-400 font-bold uppercase tracking-tight mb-1">Order #</p>
                                        <p className="text-2xl font-mono font-bold text-deep-forest tracking-tighter">
                                            {orderNumber}
                                        </p>
                                    </div>
                                    <div className="h-12 w-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-stone-100">
                                        <Package className="h-6 w-6 text-stone-200" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <Button asChild className="w-full bg-deep-forest hover:bg-deep-forest/90 h-16 text-sm font-bold tracking-[0.2em] rounded-2xl shadow-xl shadow-deep-forest/20 group uppercase">
                                <Link href="/account/orders">
                                    VIEW ORDER STATUS
                                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full border-stone-100 text-stone-500 hover:bg-stone-50 h-16 text-sm font-bold tracking-[0.2em] rounded-2xl uppercase">
                                <Link href="/shop">
                                    <ShoppingBag className="mr-2 h-4 w-4" />
                                    Continue Shopping
                                </Link>
                            </Button>
                        </div>

                        <div className="mt-10 pt-10 border-t border-stone-50 flex flex-col items-center gap-4 text-stone-400">
                            <div className="flex gap-4 opacity-40">
                                <ShieldCheck className="h-5 w-5" />
                                <Package className="h-5 w-5" />
                                <ShoppingBag className="h-5 w-5" />
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-center">
                                We've sent a detailed receipt to your email.<br />
                                Need help? <Link href="/contact" className="text-deep-forest underline">Support</Link>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
