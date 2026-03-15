'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, Loader2 } from 'lucide-react';
import { syncCustomersToResend, getAllCustomersForExport } from '../customer-actions';
import { toast } from 'sonner';

export function CustomerControls() {
    const [syncing, setSyncing] = useState(false);
    const [exporting, setExporting] = useState(false);

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await syncCustomersToResend();
            if (res.success) {
                toast.success(res.message);
            } else {
                toast.error(res.error || 'Failed to sync customers');
            }
        } catch (err) {
            toast.error('An unexpected error occurred during sync');
        } finally {
            setSyncing(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const res = await getAllCustomersForExport();
            if (res.success && res.data) {
                const data = res.data;
                if (data.length === 0) {
                    toast.info('No customers to export');
                    return;
                }

                // Create CSV string
                const headers = Object.keys(data[0]).join(',');
                const rows = data.map(row => 
                    Object.values(row)
                        .map(val => `"${String(val).replace(/"/g, '""')}"`) // Escape quotes
                        .join(',')
                );
                const csvContent = [headers, ...rows].join('\n');

                // Trigger download
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                toast.success('Customers exported successfully');
            } else {
                toast.error(res.error || 'Failed to export customers');
            }
        } catch (err) {
            toast.error('An unexpected error occurred during export');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="flex items-center gap-3">
            <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={exporting}
                className="rounded-lg h-9"
            >
                {exporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Download className="mr-2 h-4 w-4" />
                )}
                Export CSV
            </Button>
            
            <Button
                variant="default"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className="rounded-lg h-9 bg-indigo-600 hover:bg-indigo-500"
            >
                {syncing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sync to Resend
            </Button>
        </div>
    );
}
