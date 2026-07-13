'use client';

import { Check, CreditCard, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentMethodCardProps {
    id: string;
    title: string;
    description: string;
    icon: 'online' | 'cod';
    selected: boolean;
    onSelect: (id: string) => void;
    disabled?: boolean;
}

export function PaymentMethodCard({
    id,
    title,
    description,
    icon,
    selected,
    onSelect,
    disabled
}: PaymentMethodCardProps) {
    return (
        <div
            onClick={() => !disabled && onSelect(id)}
            className={cn(
                "relative flex items-start gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all duration-300",
                "hover:shadow-md active:scale-[0.98]",
                selected
                    ? "border-deep-forest bg-deep-forest/5 shadow-sm"
                    : "border-stone-100 bg-white hover:border-gray-200",
                disabled && "opacity-50 cursor-not-allowed grayscale"
            )}
        >
            <div className={cn(
                "p-3 rounded-lg flex-shrink-0",
                selected ? "bg-deep-forest text-white" : "bg-stone-50 text-stone-400"
            )}>
                {icon === 'online' ? (
                    <div className="flex flex-col items-center">
                        <CreditCard className="h-6 w-6 mb-1" />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Instant</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <Truck className="h-6 w-6 mb-1" />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Pay later</span>
                    </div>
                )}
            </div>

            <div className="flex-1">
                <h3 className={cn(
                    "font-bold text-base",
                    selected ? "text-deep-forest" : "text-stone-900"
                )}>
                    {title}
                </h3>
                <p className="text-stone-500 text-sm mt-0.5 leading-relaxed">
                    {description}
                </p>
            </div>

            <div className={cn(
                "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors",
                selected ? "bg-deep-forest border-deep-forest" : "border-stone-100"
            )}>
                {selected && <Check className="h-4 w-4 text-white" />}
            </div>
        </div>
    );
}
