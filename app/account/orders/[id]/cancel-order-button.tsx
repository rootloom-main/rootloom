'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { cancelOrder } from '@/lib/actions/order';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';

interface CancelOrderButtonProps {
    orderId: string;
    orderStatus: string;
}

export function CancelOrderButton({ orderId, orderStatus }: CancelOrderButtonProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Only show button for pending or processing orders
    if (orderStatus !== 'pending' && orderStatus !== 'processing') {
        return null;
    }

    const handleCancel = () => {
        if (
            !confirm(
                'Are you sure you want to cancel this order? This action cannot be undone.'
            )
        ) {
            return;
        }

        startTransition(async () => {
            const result = await cancelOrder(orderId);

            if (result.success) {
                toast.success(result.message);
                router.refresh();
            } else {
                toast.error(result.message);
            }
        });
    };

    return (
        <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isPending}
            className="w-full sm:w-auto"
        >
            <XCircle className="h-4 w-4 mr-2" />
            {isPending ? 'Cancelling...' : 'Cancel Order'}
        </Button>
    );
}
