import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight, Package, Home, Clock, Truck, RefreshCcw } from 'lucide-react';

export default function ReturnSuccessPage({ params }: { params: { id: string } }) {
    return (
        <div className="container mx-auto px-4 py-12 md:py-20 max-w-4xl">
            {/* Header Section */}
            <div className="text-center mb-16 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-green-500/10 rounded-full blur-2xl animate-pulse" />
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-50 rounded-full mb-6 relative z-10 border-4 border-white shadow-xl">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-deep-forest mb-4 tracking-tight">
                    Request Submitted!
                </h1>
                <p className="text-lg text-stone-500 max-w-xl mx-auto leading-relaxed">
                    We've received your request for order <span className="font-bold text-deep-forest">#{params.id.slice(0, 8).toUpperCase()}</span>.
                    Our team is on it and will update you shortly.
                </p>
            </div>

            {/* Visual Tracker Section */}
            <div className="bg-white border border-stone-100 shadow-sm rounded-3xl p-8 md:p-12 mb-12">
                <h2 className="text-xl font-bold text-deep-forest mb-8 text-center uppercase tracking-widest text-sm">What happens next?</h2>

                <div className="relative flex flex-col md:flex-row justify-between gap-8 md:gap-0">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-[28px] left-[10%] right-[10%] h-[2px] bg-stone-100 z-0" />
                    {/* Connecting Line (Mobile) */}
                    <div className="md:hidden absolute top-8 bottom-8 left-[28px] w-[2px] bg-stone-100 z-0" />

                    {/* Step 1 */}
                    <div className="relative z-10 flex md:flex-col items-center gap-4 md:gap-3 text-center md:w-1/4">
                        <div className="w-14 h-14 rounded-full bg-deep-forest text-white border-4 border-white shadow-md flex items-center justify-center">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div className="text-left md:text-center">
                            <h3 className="font-bold text-deep-forest">Request Received</h3>
                            <p className="text-sm text-stone-500 mt-1">Today</p>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="relative z-10 flex md:flex-col items-center gap-4 md:gap-3 text-center md:w-1/4 opacity-60">
                        <div className="w-14 h-14 rounded-full bg-stone-100 text-stone-400 border-4 border-white shadow-sm flex items-center justify-center">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div className="text-left md:text-center">
                            <h3 className="font-bold text-deep-forest">Under Review</h3>
                            <p className="text-sm text-stone-500 mt-1">Within 24-48 hrs</p>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="relative z-10 flex md:flex-col items-center gap-4 md:gap-3 text-center md:w-1/4 opacity-60">
                        <div className="w-14 h-14 rounded-full bg-stone-100 text-stone-400 border-4 border-white shadow-sm flex items-center justify-center">
                            <Truck className="h-6 w-6" />
                        </div>
                        <div className="text-left md:text-center">
                            <h3 className="font-bold text-deep-forest">Item Pickup</h3>
                            <p className="text-sm text-stone-500 mt-1">Courier Assigned</p>
                        </div>
                    </div>

                    {/* Step 4 */}
                    <div className="relative z-10 flex md:flex-col items-center gap-4 md:gap-3 text-center md:w-1/4 opacity-60">
                        <div className="w-14 h-14 rounded-full bg-stone-100 text-stone-400 border-4 border-white shadow-sm flex items-center justify-center">
                            <RefreshCcw className="h-6 w-6" />
                        </div>
                        <div className="text-left md:text-center">
                            <h3 className="font-bold text-deep-forest">Resolution</h3>
                            <p className="text-sm text-stone-500 mt-1">Refund or Exchange</p>
                        </div>
                    </div>
                </div>

                <div className="mt-12 bg-stone-50 rounded-2xl p-6 text-sm text-stone-600 border border-stone-100">
                    <p className="font-medium text-deep-forest mb-2">💡 Quick Tip:</p>
                    <p>Please keep the item in its original condition with all tags and packaging intact while you wait for the pickup. You'll receive an email as soon as the review is complete.</p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild className="w-full sm:w-auto h-14 px-8 bg-deep-forest hover:bg-deep-forest/90 text-white font-bold tracking-wide rounded-xl shadow-lg transition-all group">
                    <Link href={`/account/orders/${params.id}`}>
                        <Package className="mr-2 h-5 w-5" />
                        TRACK ORDER DETAILS
                        <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Link>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto h-14 px-8 border-2 border-stone-200 text-deep-forest font-bold tracking-wide rounded-xl hover:bg-stone-50 transition-all">
                    <Link href="/shop">
                        <Home className="mr-2 h-5 w-5" />
                        CONTINUE SHOPPING
                    </Link>
                </Button>
            </div>
        </div>
    );
}
