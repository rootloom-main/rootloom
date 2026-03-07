'use client';
import { Button } from '@/components/ui/button';
import { Activity, Download } from 'lucide-react';

interface AdminAnalyticsHeaderProps {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    totalCustomers: number;
}

export function AdminAnalyticsHeader({
    totalRevenue,
    totalOrders,
    averageOrderValue,
    totalCustomers
}: AdminAnalyticsHeaderProps) {

    const handleExport = () => {
        // Simple CSV generation
        const headers = ['Metric', 'Value'];
        const rows = [
            ['Total Revenue', totalRevenue.toString()],
            ['Total Orders', totalOrders.toString()],
            ['Average Order Value', averageOrderValue.toString()],
            ['Total Customers', totalCustomers.toString()]
        ];

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `analytics_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleLiveActivity = () => {
        // Simply refresh the page to get the latest data for "Live" view in this architecture
        window.location.reload();
    };

    return (
        <div className="flex items-center gap-3">
            <Button
                variant="ghost"
                onClick={handleLiveActivity}
                className="rounded-xl border border-stone-200 hover:bg-white hover:shadow-sm transition-all h-12 px-6"
            >
                <Activity className="w-4 h-4 mr-2 text-raw-clay" /> Refresh Live Data
            </Button>
            <Button
                onClick={handleExport}
                className="bg-deep-forest hover:bg-deep-forest/90 text-white rounded-xl shadow-xl shadow-deep-forest/20 h-12 px-8 font-medium"
            >
                <Download className="w-4 h-4 mr-2" /> Export Analytics
            </Button>
        </div>
    );
}
