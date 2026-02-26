'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, ToggleLeft, ToggleRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface CouponActionsProps {
    couponId: string;
    isActive: boolean;
}

export function CouponActions({ couponId, isActive }: CouponActionsProps) {
    const router = useRouter();
    const supabase = createClient();

    const handleToggle = async () => {
        const { error } = await supabase
            .from('coupons')
            .update({ is_active: !isActive })
            .eq('id', couponId);

        if (error) {
            toast.error('Failed to update coupon status');
            console.error(error);
            return;
        }
        toast.success(isActive ? 'Coupon deactivated' : 'Coupon activated');
        router.refresh();
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this coupon?')) return;

        const { error } = await supabase
            .from('coupons')
            .delete()
            .eq('id', couponId);

        if (error) {
            toast.error('Failed to delete coupon');
            console.error(error);
            return;
        }
        toast.success('Coupon deleted');
        router.refresh();
    };

    return (
        <div className="flex justify-end gap-1">
            <Button
                variant="ghost"
                size="icon"
                onClick={handleToggle}
                title={isActive ? 'Deactivate' : 'Activate'}
            >
                {isActive ? (
                    <ToggleRight className="h-4 w-4 text-green-600" />
                ) : (
                    <ToggleLeft className="h-4 w-4 text-gray-400" />
                )}
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-600"
                onClick={handleDelete}
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
}
