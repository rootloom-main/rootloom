'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Switch } from '@/components/ui/switch';
import { Undo2 } from 'lucide-react';
import { toast } from 'sonner';
// Note: importing server action directly
import { processRefund } from '@/app/admin/orders/refund-action';

interface RefundButtonProps {
    orderId: string;
    orderTotal: number;
    currentRefundStatus: string | null;
}

export function RefundOrderButton({ orderId, orderTotal, currentRefundStatus }: RefundButtonProps) {
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState(orderTotal.toString());
    const [restock, setRestock] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleRefund = async () => {
        setLoading(true);
        const formData = new FormData();
        formData.append('orderId', orderId);
        formData.append('amount', amount);
        formData.append('restock', String(restock));

        const result = await processRefund(formData);

        if (result?.error) {
            toast.error(result.error);
        } else {
            toast.success('Refund processed successfully');
            setOpen(false);
        }
        setLoading(false);
    };

    if (currentRefundStatus === 'processed') {
        return <div className="text-sm font-medium text-green-600 border border-green-200 bg-green-50 px-3 py-1 rounded">Refund Processed</div>;
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                    <Undo2 className="mr-2 h-4 w-4" />
                    Process Refund
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Process Refund</DialogTitle>
                    <DialogDescription>
                        Refund this order. This action cannot be undone efficiently.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">
                            Amount
                        </Label>
                        <Input
                            id="amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="restock" className="text-right">
                            Restock Inventory
                        </Label>
                        <Switch
                            id="restock"
                            checked={restock}
                            onCheckedChange={setRestock}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleRefund} disabled={loading} variant="destructive">
                        {loading ? 'Processing...' : 'Confirm Refund'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
