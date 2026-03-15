'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
    RefreshCcw,
    Clock,
    ArrowLeft,
    ShieldAlert,
    CreditCard,
    ShoppingBag,
    Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';

function FailureContent() {
    const searchParams = useSearchParams();
    const reason = searchParams?.get('reason');
    const [isMounted, setIsMounted] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    useEffect(() => {
        // 1. Mark as mounted to enable client-only content
        setIsMounted(true);

        // 2. Timer Resilience: Use consistent v5 key
        const EXPIRY_KEY = 'rootloom_checkout_expiry_v5';
        const now = Date.now();
        let expiry = localStorage.getItem(EXPIRY_KEY);

        // Reset if no expiry or if it's in the past
        if (!expiry || parseInt(expiry) < now) {
            const fifteenMinutes = 15 * 60 * 1000;
            expiry = (now + fifteenMinutes).toString();
            localStorage.setItem(EXPIRY_KEY, expiry);
        }

        const expiryTime = parseInt(expiry);
        const calculateRemaining = () => Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
        
        setTimeLeft(calculateRemaining());
        const interval = setInterval(() => {
            setTimeLeft(calculateRemaining());
        }, 1000);

        // 3. Failsafe Purge: Seeking and destroying any Razorpay shards
        const purgeRazorpay = () => {
            try {
                const selectors = ['.razorpay-container', '.razorpay-backdrop', 'iframe[src*="razorpay"]'];
                selectors.forEach(sel => {
                    document.querySelectorAll(sel).forEach(el => el.remove());
                });
                // Force body reset
                document.body.style.overflow = 'auto';
                document.body.style.position = 'static';
                document.body.classList.remove('razorpay-opened');
            } catch (e) {}
        };

        purgeRazorpay();
        const t1 = setTimeout(purgeRazorpay, 500);
        const t2 = setTimeout(purgeRazorpay, 2000);

        return () => {
            clearInterval(interval);
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, []);

    const formatTime = (seconds: number | null) => {
        if (seconds === null) return "--:--";
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const premiumEase = [0.16, 1, 0.3, 1] as any;

    const getMessage = () => {
        if (reason === 'cancelled') return { title: "Payment Cancelled", desc: "You closed the payment window. Your items are still reserved." };
        if (reason === 'BAD_REQUEST_ERROR') return { title: "Action Required", desc: "There was a technical issue with the gateway. Please try again or use another method." };
        return { title: "Payment Failed", desc: "Your transaction was unsuccessful. Your selection is reserved for you." };
    };

    const content = getMessage();

    // SERVER PRE-RENDER SKELETON
    if (!isMounted) {
        return (
            <div className="min-h-screen w-full bg-stone-50 flex flex-col items-center justify-center p-6">
                <div className="w-16 h-16 rounded-full bg-stone-200 animate-pulse" />
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-stone-50 flex flex-col items-center justify-center p-6 selection:bg-stone-200 overflow-hidden relative font-sans">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-stone-200/50 to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: premiumEase }}
                className="max-w-lg w-full bg-white rounded-[2rem] shadow-xl shadow-stone-200/50 border border-stone-100 p-8 md:p-12 relative z-10 overflow-hidden"
            >
                {/* Subtle top border accent */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-400 to-rose-400" />

                {/* Visual Status */}
                <div className="flex justify-center mb-8">
                    <div className="relative">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, ease: premiumEase }}
                            className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center border-8 border-white shadow-sm" 
                        >
                            <ShieldAlert className="w-10 h-10 text-red-500" strokeWidth={1.5} />
                        </motion.div>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1.2, delay: 0.2, ease: premiumEase }}
                            className="absolute inset-[-20px] bg-red-100/50 rounded-full blur-2xl -z-10" 
                        />
                    </div>
                </div>

                {/* Messaging */}
                <div className="space-y-5 text-center mb-10">
                    <motion.h1 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2, ease: premiumEase }}
                        className="text-3xl md:text-4xl font-serif font-bold text-stone-900 tracking-tight"
                    >
                        {content.title}
                    </motion.h1>
                    
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="space-y-6"
                    >
                        <p className="text-stone-500 font-medium text-sm md:text-base max-w-[320px] mx-auto leading-relaxed">
                            {content.desc} No charges were made to your account.
                        </p>
                        
                        <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-stone-50/80 rounded-full border border-stone-200/80 backdrop-blur-sm">
                           <Clock className="w-4 h-4 text-stone-400" />
                           <span className="text-xs font-bold tracking-widest text-stone-600 uppercase">
                               Items reserved for {formatTime(timeLeft)}
                           </span>
                        </div>
                    </motion.div>
                </div>

                {/* Production Recovery Actions */}
                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5, ease: premiumEase }}
                    className="flex flex-col gap-3 pt-2"
                >
                    <Button asChild className="h-14 rounded-xl bg-stone-900 hover:bg-black text-white px-8 text-xs font-bold tracking-widest uppercase transition-all shadow-md hover:shadow-lg group">
                        <Link href="/checkout?retry=true" className="flex items-center justify-center">
                            Retry Payment <RefreshCcw className="ml-2.5 w-4 h-4 transition-transform group-hover:rotate-180 duration-500" />
                        </Link>
                    </Button>

                    <div className="grid grid-cols-2 gap-3 mt-2">
                        <Button variant="outline" asChild className="h-12 rounded-xl border-stone-200 text-stone-700 hover:bg-stone-50 hover:text-stone-900 text-xs font-bold tracking-widest uppercase transition-all">
                            <Link href="/checkout?cod=true" className="flex items-center gap-2 justify-center">
                                <CreditCard className="w-4 h-4" /> Pay COD
                            </Link>
                        </Button>
                        <Button variant="ghost" asChild className="h-12 rounded-xl text-stone-500 hover:text-stone-900 bg-stone-50/50 hover:bg-stone-100 text-xs font-bold tracking-widest uppercase transition-all">
                            <Link href="/cart" className="flex items-center gap-2 justify-center">
                                <ShoppingBag className="w-4 h-4" /> Review Bag
                            </Link>
                        </Button>
                    </div>
                </motion.div>

                {/* Support Footer */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                    className="mt-10 pt-6 flex items-center justify-between border-t border-stone-100 text-stone-400"
                >
                    <Link href="/" className="inline-flex items-center gap-2 hover:text-stone-900 transition-colors group">
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        <span className="text-xs font-bold tracking-widest uppercase">Return Home</span>
                    </Link>
                    <Link href="/contact" className="inline-flex items-center gap-2 hover:text-stone-900 transition-colors">
                        <Mail className="w-4 h-4" />
                        <span className="text-xs font-bold tracking-widest uppercase">Contact Support</span>
                    </Link>
                </motion.div>
            </motion.div>

            {/* Subtle Texture */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.02] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-multiply" />

            <style jsx global>{`
                @font-face {
                    font-family: 'Serif';
                    src: local('Playfair Display'), local('Georgia');
                }
                body {
                    background-color: white !important;
                    overflow: hidden !important;
                }
            `}</style>
        </div>
    );
}

export default function CheckoutFailedPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full bg-white flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
        </div>}>
            <FailureContent />
        </Suspense>
    );
}
