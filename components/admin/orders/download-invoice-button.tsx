'use client';

import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

interface DownloadInvoiceButtonProps {
    order: any;
}

export function DownloadInvoiceButton({ order }: DownloadInvoiceButtonProps) {
    return (
        <Button variant="outline" size="sm" asChild>
            <a href={`/api/admin/orders/${order.id}/invoice`} download={`invoice-${order.order_number}.pdf`}>
                <FileText className="mr-2 h-4 w-4" />
                Download Invoice
            </a>
        </Button>
    );
}
