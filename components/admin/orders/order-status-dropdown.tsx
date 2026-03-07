'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Loader2 } from 'lucide-react';
import { updateOrderStatus } from '@/app/admin/orders/status-action';

interface OrderStatusDropdownProps {
    orderId: string;
    currentStatus: string;
}

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export function OrderStatusDropdown({ orderId, currentStatus }: OrderStatusDropdownProps) {
    const [status, setStatus] = useState(currentStatus);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleStatusChange = (newStatus: string) => {
        setStatus(newStatus);
        startTransition(async () => {
            const result = await updateOrderStatus(orderId, newStatus);
            if (result?.error) {
                toast.error(result.error);
                setStatus(currentStatus); // revert
            } else {
                toast.success(`Order status updated to ${newStatus}`);
                router.refresh();
            }
        });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isPending} className="capitalize flex items-center gap-2">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {status}
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup value={status} onValueChange={handleStatusChange}>
                    {STATUSES.map((s) => (
                        <DropdownMenuRadioItem key={s} value={s} className="capitalize">
                            {s}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
