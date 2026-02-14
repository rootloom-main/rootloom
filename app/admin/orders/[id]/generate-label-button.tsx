'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface GenerateLabelButtonProps {
    orderId: string;
    disabled?: boolean;
}

export default function GenerateLabelButton({ orderId, disabled }: GenerateLabelButtonProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleGenerateLabel = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/orders/${orderId}/label`, {
                method: 'POST',
            });

            if (!response.ok) {
                const errorData = await response.json();
                alert(`Error: ${errorData.error || 'Failed to generate label'}`);
                return;
            }

            const data = await response.json();
            alert(`Success: ${data.message}\nTracking: ${data.label.trackingNumber}`);
            router.refresh(); // Refresh to show new status and tracking number
        } catch (error) {
            console.error('Error generating label:', error);
            alert('An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            onClick={handleGenerateLabel}
            disabled={disabled || loading}
            variant="outline"
            className="gap-2"
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
            Generate Label
        </Button>
    );
}
