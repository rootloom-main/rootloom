'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ShipOrderButtonProps {
    orderId: string;
    disabled?: boolean;
}

export default function ShipOrderButton({ orderId, disabled }: ShipOrderButtonProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [trackingNumber, setTrackingNumber] = useState('');
    const router = useRouter();

    const handleShipOrder = async () => {
        if (!trackingNumber.trim()) {
            toast.error('Tracking number is required');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/admin/orders/${orderId}/label`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ trackingNumber: trackingNumber.trim() }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                toast.error(errorData.error || 'Failed to mark as shipped');
                return;
            }

            toast.success('Order marked as shipped');
            setOpen(false);
            router.refresh();
        } catch (error) {
            console.error('Error shipping order:', error);
            toast.error('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    disabled={disabled}
                    variant="outline"
                    className="gap-2"
                >
                    <Truck className="h-4 w-4" />
                    Ship Order
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Ship Order</DialogTitle>
                    <DialogDescription>
                        Enter the tracking number for this order to mark it as shipped.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="tracking" className="text-right">
                            Tracking #
                        </Label>
                        <Input
                            id="tracking"
                            placeholder="e.g. TRK123456789"
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleShipOrder} disabled={loading} className="bg-deep-forest hover:bg-deep-forest/90">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Shipment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
