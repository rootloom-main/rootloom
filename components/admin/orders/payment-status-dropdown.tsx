'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Loader2, Check } from 'lucide-react';
import { updateOrderPaymentStatus } from '@/app/admin/orders/payment-action';
import { cn } from '@/lib/utils';

interface PaymentStatusDropdownProps {
    orderId: string;
    currentPaymentStatus: string;
    isCOD?: boolean;
    compact?: boolean;
    align?: 'start' | 'end';
}

const STATUS_CONFIG: Record<
    string,
    {
        label: string;
        dotColor: string;
        badgeStyle: string;
        hoverStyle: string;
    }
> = {
    completed: {
        label: 'Paid',
        dotColor: 'bg-emerald-500',
        badgeStyle: 'bg-emerald-50/80 text-emerald-800 border-emerald-200/70',
        hoverStyle: 'hover:bg-emerald-100/70 hover:border-emerald-300',
    },
    pending: {
        label: 'Pending',
        dotColor: 'bg-amber-500',
        badgeStyle: 'bg-amber-50/80 text-amber-800 border-amber-200/70',
        hoverStyle: 'hover:bg-amber-100/70 hover:border-amber-300',
    },
    failed: {
        label: 'Failed',
        dotColor: 'bg-rose-500',
        badgeStyle: 'bg-rose-50/80 text-rose-800 border-rose-200/70',
        hoverStyle: 'hover:bg-rose-100/70 hover:border-rose-300',
    },
};

const PAYMENT_STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending', desc: 'Awaiting payment', dot: 'bg-amber-500' },
    { value: 'completed', label: 'Paid', desc: 'Payment received', dot: 'bg-emerald-500' },
    { value: 'failed', label: 'Failed', desc: 'Payment rejected', dot: 'bg-rose-500' },
];

export function PaymentStatusDropdown({
    orderId,
    currentPaymentStatus,
    compact = false,
    align = 'start',
}: PaymentStatusDropdownProps) {
    const [status, setStatus] = useState(currentPaymentStatus);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const currentConfig = STATUS_CONFIG[status] || {
        label: status,
        dotColor: 'bg-stone-400',
        badgeStyle: 'bg-stone-50 text-stone-700 border-stone-200',
        hoverStyle: 'hover:bg-stone-100',
    };

    const handleStatusChange = (newStatus: string) => {
        if (newStatus === status) return;
        const previousStatus = status;
        setStatus(newStatus);

        startTransition(async () => {
            const result = await updateOrderPaymentStatus(
                orderId,
                newStatus as 'pending' | 'completed' | 'failed'
            );
            if (result?.error) {
                toast.error(result.error);
                setStatus(previousStatus);
            } else {
                toast.success(
                    newStatus === 'completed'
                        ? 'Payment marked as Paid'
                        : `Payment status updated to ${newStatus}`
                );
                router.refresh();
            }
        });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    disabled={isPending}
                    className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border font-medium transition-all duration-150 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-stone-400/40',
                        currentConfig.badgeStyle,
                        currentConfig.hoverStyle,
                        compact ? 'h-6 px-2 text-[11px]' : 'h-7 px-2.5 text-xs',
                        isPending && 'opacity-60 cursor-not-allowed'
                    )}
                >
                    {isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin text-stone-500" />
                    ) : (
                        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', currentConfig.dotColor)} />
                    )}
                    <span>{currentConfig.label}</span>
                    <ChevronDown className="h-3 w-3 opacity-50 ml-0.5" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align={align}
                sideOffset={4}
                className="w-44 p-1.5 bg-white rounded-xl border border-stone-200 shadow-xl z-50 text-stone-900"
            >
                <div className="px-2 py-1 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                    Change Status
                </div>
                <div className="space-y-0.5">
                    {PAYMENT_STATUS_OPTIONS.map((opt) => {
                        const isSelected = opt.value === status;
                        return (
                            <DropdownMenuItem
                                key={opt.value}
                                onClick={() => handleStatusChange(opt.value)}
                                className={cn(
                                    'flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer outline-none transition-colors !bg-transparent hover:!bg-stone-100 focus:!bg-stone-100 !text-stone-800',
                                    isSelected && '!bg-stone-100/80 font-medium'
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={cn('h-2 w-2 rounded-full shrink-0', opt.dot)} />
                                    <div className="flex flex-col">
                                        <span className="font-medium text-stone-800">{opt.label}</span>
                                        <span className="text-[10px] text-stone-400">{opt.desc}</span>
                                    </div>
                                </div>
                                {isSelected && <Check className="h-3.5 w-3.5 text-stone-700 shrink-0" />}
                            </DropdownMenuItem>
                        );
                    })}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
