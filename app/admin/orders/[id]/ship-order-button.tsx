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
    initialTrackingNumber?: string | null;
    initialTrackingUrl?: string | null;
}

export default function ShipOrderButton({ orderId, disabled, initialTrackingNumber, initialTrackingUrl }: ShipOrderButtonProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber || '');
    const [trackingUrl, setTrackingUrl] = useState(initialTrackingUrl || '');
    const router = useRouter();

    const handleShipOrder = async () => {
        if (!trackingNumber.trim()) {
            toast.error('Tracking ID is required');
            return;
        }

        if (!trackingUrl.trim()) {
            toast.error('Tracking link is required');
            return;
        }

        try {
            new URL(trackingUrl.trim());
        } catch {
            toast.error('Please enter a valid tracking link');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/admin/orders/${orderId}/label`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    trackingNumber: trackingNumber.trim(),
                    trackingUrl: trackingUrl.trim(),
                }),
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
                    {initialTrackingNumber || initialTrackingUrl ? 'Update Tracking' : 'Ship Order'}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Ship Order</DialogTitle>
                    <DialogDescription>
                        Enter the tracking ID/AWB and the carrier tracking link to share both with the customer.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="tracking" className="text-right whitespace-nowrap">
                            Tracking ID
                        </Label>
                        <Input
                            id="tracking"
                            placeholder="e.g. AWB123456789"
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="trackingUrl" className="text-right whitespace-nowrap">
                            Tracking Link
                        </Label>
                        <Input
                            id="trackingUrl"
                            placeholder="https://track.delhivery.com/..."
                            value={trackingUrl}
                            onChange={(e) => setTrackingUrl(e.target.value)}
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
