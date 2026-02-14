'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ShoppingBag, Users, IndianRupee, AlertTriangle, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

interface DashboardMetricsProps {
    totalRevenue: number;
    totalOrders: number;
    pendingOrders: number;
    lowStockCount: number;
    totalCustomers: number;
}

export function DashboardMetrics({
    totalRevenue,
    totalOrders,
    pendingOrders,
    lowStockCount,
    totalCustomers
}: DashboardMetricsProps) {

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-stone-200/60 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Total Revenue</CardTitle>
                    <IndianRupee className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalRevenue)}</div>
                    <p className="text-xs text-green-600 flex items-center mt-1">
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                        +20.1% from last month
                    </p>
                </CardContent>
            </Card>

            <Card className="border-stone-200/60 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Orders</CardTitle>
                    <Package className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{totalOrders}</div>
                    <p className="text-xs text-slate-500 mt-1">
                        <span className="text-amber-600 font-medium">{pendingOrders} pending</span> processing
                    </p>
                </CardContent>
            </Card>

            <Card className="border-stone-200/60 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Active Customers</CardTitle>
                    <Users className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{totalCustomers}</div>
                    <p className="text-xs text-green-600 flex items-center mt-1">
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                        +18 new this month
                    </p>
                </CardContent>
            </Card>

            <Card className="border-stone-200/60 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Inventory Status</CardTitle>
                    <Activity className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{lowStockCount}</div>
                    <p className="text-xs text-red-500 flex items-center mt-1 font-medium">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Low stock alerts
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
