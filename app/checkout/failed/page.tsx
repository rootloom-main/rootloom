'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, ArrowLeft, RefreshCw, HelpCircle, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CheckoutFailedPage() {
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
                        className="inline-flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-full border border-red-100 mb-6"
                    >
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Transaction Incomplete</span>
                    </motion.div>
                    <h1 className="text-5xl font-serif font-bold text-stone-900 mb-4">
                        Oh No.
                    </h1>
                    <p className="text-stone-500 font-medium max-w-sm mx-auto leading-relaxed">
                        We couldn't finalize your payment. No funds were processed from your account.
                    </p>
                </div>

                <Card className="border-none shadow-2xl bg-white rounded-[2rem] overflow-hidden">
                    <CardContent className="p-10 text-center">
                        <div className="bg-stone-50/50 rounded-2xl p-8 mb-10 text-left border border-stone-100">
                            <h3 className="text-sm font-bold text-stone-900 mb-4 flex items-center tracking-tight">
                                <HelpCircle className="h-4 w-4 mr-2 text-stone-400" />
                                Recommended Actions
                            </h3>
                            <ul className="text-sm text-stone-500 space-y-3 pl-1">
                                <li className="flex items-start gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-stone-300 mt-1.5 shrink-0" />
                                    <span>Verify your card details and try again.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-stone-300 mt-1.5 shrink-0" />
                                    <span>Ensure you have sufficient funds or credit limit.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-stone-300 mt-1.5 shrink-0" />
                                    <span>Try a different method like UPI or Netbanking.</span>
                                </li>
                            </ul>
                        </div>

                        <div className="space-y-4">
                            <Button asChild className="w-full bg-stone-900 hover:bg-black h-16 text-sm font-bold tracking-[0.2em] rounded-2xl shadow-xl shadow-stone-900/10 group uppercase">
                                <Link href="/checkout">
                                    <RefreshCw className="mr-2 h-4 w-4 group-hover:rotate-180 transition-transform duration-700" />
                                    Retry Payment
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full border-stone-100 text-stone-400 hover:bg-stone-50 h-16 text-sm font-bold tracking-[0.2em] rounded-2xl uppercase">
                                <Link href="/cart">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Return to Cart
                                </Link>
                            </Button>
                        </div>

                        <div className="mt-10 pt-10 border-t border-stone-50 flex items-center justify-center gap-3 text-stone-300">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-center">
                                Your payment info is never stored on our servers.
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
