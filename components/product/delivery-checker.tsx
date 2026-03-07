'use client';

import { useState } from 'react';
import { Truck, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function DeliveryChecker() {
    const [pincode, setPincode] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [deliveryStatus, setDeliveryStatus] = useState<{
        available: boolean;
        date?: string;
        message?: string;
    } | null>(null);

    // Default estimate (Now + 5 days)
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 5);
    const defaultDeliveryDate = defaultDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'short' });

    const checkDelivery = async () => {
        if (!pincode || pincode.length !== 6) {
            toast.error('Please enter a valid 6-digit pincode');
            return;
        }

        setIsChecking(true);
        setDeliveryStatus(null);

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Mock logic: Pincodes starting with 1-8 are deliverable
        const isDeliverable = /^[1-8]/.test(pincode);

        const date = new Date();
        // Faster delivery for specific zones as an example
        const deliveryDays = pincode.startsWith('1') ? 2 : (pincode.startsWith('8') ? 7 : 4);
        date.setDate(date.getDate() + (isDeliverable ? deliveryDays : 0));
        const deliveryDate = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'short' });

        setDeliveryStatus({
            available: isDeliverable,
            date: isDeliverable ? deliveryDate : undefined,
            message: isDeliverable ? `Get it by ${deliveryDate}` : 'Not available at this pincode',
        });

        setIsChecking(false);
    };

    return (
        <div className="space-y-4 pt-6 border-t border-stone-100">
            <div className="flex items-center gap-2 text-sm font-bold text-deep-forest uppercase tracking-wider">
                <Truck className="h-4 w-4 text-moss-olive" />
                Delivery & Returns
            </div>

            {!deliveryStatus && (
                <div className="text-sm text-stone-700 bg-moss-olive/5 rounded-xl p-4 border border-moss-olive/10">
                    <span className="font-bold text-deep-forest">Standard Delivery:</span> {defaultDeliveryDate}
                    <p className="text-xs text-stone-500 mt-1 font-medium">Enter PIN code below to check exact delivery options.</p>
                </div>
            )}

            <div className="flex gap-2 relative">
                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none z-10">
                    <MapPin className="h-4 w-4 text-stone-400" />
                </div>
                <div className="relative flex-1">
                    <Input
                        placeholder="Enter Pincode"
                        maxLength={6}
                        value={pincode}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setPincode(val);
                            if (val.length === 0) setDeliveryStatus(null);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && checkDelivery()}
                        className="pl-10 h-11 rounded-xl font-sans tracking-widest ring-offset-white focus-visible:ring-moss-olive border-stone-200 bg-white"
                    />
                </div>
                <Button
                    onClick={checkDelivery}
                    disabled={isChecking || pincode.length !== 6}
                    className="h-11 rounded-xl bg-deep-forest text-white hover:bg-slate-900 border-none transition-all px-8 font-bold"
                >
                    {isChecking ? '...' : 'Check'}
                </Button>
            </div>

            {deliveryStatus && (
                <div className={`text-sm flex items-start gap-3 p-3 rounded-md border ${deliveryStatus.available ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                    {deliveryStatus.available ? (
                        <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-green-600" />
                    ) : (
                        <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-600" />
                    )}
                    <div>
                        <span className="font-semibold">{deliveryStatus.message}</span>
                        {deliveryStatus.available && (
                            <p className="text-xs text-green-700/80 mt-1 flex items-center gap-1">
                                Cash on Delivery is available
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
