'use client';

import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { InvoicePDF } from './invoice-pdf';
import { FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

interface DownloadInvoiceButtonProps {
    order: any;
}

export function DownloadInvoiceButton({ order }: DownloadInvoiceButtonProps) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return (
            <Button variant="outline" size="sm" disabled>
                <FileText className="mr-2 h-4 w-4" />
                Prepare Invoice
            </Button>
        );
    }

    return (
        <PDFDownloadLink
            document={<InvoicePDF order={order} />}
            fileName={`invoice-${order.order_number}.pdf`}
            className="text-decoration-none"
        >
            {({ blob, url, loading, error }) => (
                <Button variant="outline" size="sm" disabled={loading}>
                    <FileText className="mr-2 h-4 w-4" />
                    {loading ? 'Generating...' : 'Download Invoice'}
                </Button>
            )}
        </PDFDownloadLink>
    );
}
