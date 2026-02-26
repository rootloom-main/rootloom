'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, ToggleLeft, ToggleRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';

interface BannerActionsProps {
    bannerId: string;
    active: boolean;
}

export function BannerActions({ bannerId, active }: BannerActionsProps) {
    const router = useRouter();
    const supabase = createClient();

    const handleToggle = async () => {
        const { error } = await supabase
            .from('banners')
            .update({ active: !active })
            .eq('id', bannerId);

        if (error) {
            toast.error('Failed to update banner status');
            console.error(error);
            return;
        }
        toast.success(active ? 'Banner deactivated' : 'Banner activated');
        router.refresh();
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this banner?')) return;

        const { error } = await supabase
            .from('banners')
            .delete()
            .eq('id', bannerId);

        if (error) {
            toast.error('Failed to delete banner');
            console.error(error);
            return;
        }
        toast.success('Banner deleted');
        router.refresh();
    };

    return (
        <div className="flex justify-end gap-1">
            <Button
                variant="ghost"
                size="icon"
                onClick={handleToggle}
                title={active ? 'Deactivate' : 'Activate'}
            >
                {active ? (
                    <ToggleRight className="h-4 w-4 text-green-600" />
                ) : (
                    <ToggleLeft className="h-4 w-4 text-gray-400" />
                )}
            </Button>
            <Button variant="ghost" size="icon" asChild>
                <Link href={`/admin/marketing/banners/${bannerId}/edit`}>
                    <Edit className="h-4 w-4" />
                </Link>
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
