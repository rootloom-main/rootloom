'use client';
import { useState, useMemo } from 'react';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Search, Calendar as CalendarIcon, Banknote, CreditCard, Filter } from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatPrice } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import { PaymentStatusDropdown } from '@/components/admin/orders/payment-status-dropdown';

interface Order {
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    payment_id?: string | null;
    paid_at?: string | null;
    total: number;
    created_at: string;
    profiles: {
        email: string;
        full_name: string | null;
    } | null;
    refund_status?: string;
    refund_amount?: number;
}

interface AdminOrdersTableProps {
    orders: Order[];
}

export function AdminOrdersTable({ orders }: AdminOrdersTableProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [methodFilter, setMethodFilter] = useState<'all' | 'cod' | 'online'>('all');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const matchesSearch =
                order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (order.profiles?.full_name && order.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (order.profiles?.email && order.profiles.email.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesDate = dateFilter ? order.created_at.startsWith(dateFilter) : true;

            const isCOD = Boolean(order.payment_id?.startsWith('COD'));
            const matchesMethod =
                methodFilter === 'all' ||
                (methodFilter === 'cod' && isCOD) ||
                (methodFilter === 'online' && !isCOD);

            const matchesPaymentStatus =
                paymentStatusFilter === 'all' || order.payment_status === paymentStatusFilter;

            return matchesSearch && matchesDate && matchesMethod && matchesPaymentStatus;
        });
    }, [orders, searchQuery, dateFilter, methodFilter, paymentStatusFilter]);

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'delivered': return 'default';
            case 'shipped': return 'secondary';
            case 'processing': return 'secondary';
            case 'cancelled': return 'destructive';
            default: return 'outline';
        }
    };

    const getRefundStatusVariant = (status: string) => {
        switch (status) {
            case 'processed': return 'default';
            case 'requested': return 'secondary';
            case 'rejected': return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto items-stretch sm:items-center flex-wrap">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                        <Input
                            placeholder="Search Order ID or Customer..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-white border-stone-200 h-9 text-xs"
                        />
                    </div>

                    <div className="relative">
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                        <Input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="pl-9 bg-white border-stone-200 text-stone-600 h-9 text-xs"
                            title="Filter by Date"
                        />
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-start md:justify-end">
                    {/* Method Filter */}
                    <div className="inline-flex items-center bg-stone-100 p-0.5 rounded-lg text-xs">
                        <button
                            type="button"
                            onClick={() => setMethodFilter('all')}
                            className={cn(
                                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                                methodFilter === 'all'
                                    ? 'bg-white text-stone-900 font-semibold shadow-xs'
                                    : 'text-stone-500 hover:text-stone-900'
                            )}
                        >
                            All Methods
                        </button>
                        <button
                            type="button"
                            onClick={() => setMethodFilter('cod')}
                            className={cn(
                                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                                methodFilter === 'cod'
                                    ? 'bg-white text-stone-900 font-semibold shadow-xs'
                                    : 'text-stone-500 hover:text-stone-900'
                            )}
                        >
                            COD
                        </button>
                        <button
                            type="button"
                            onClick={() => setMethodFilter('online')}
                            className={cn(
                                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                                methodFilter === 'online'
                                    ? 'bg-white text-stone-900 font-semibold shadow-xs'
                                    : 'text-stone-500 hover:text-stone-900'
                            )}
                        >
                            Online
                        </button>
                    </div>

                    {/* Payment Status Filter */}
                    <div className="inline-flex items-center bg-stone-100 p-0.5 rounded-lg text-xs">
                        <button
                            type="button"
                            onClick={() => setPaymentStatusFilter('all')}
                            className={cn(
                                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                                paymentStatusFilter === 'all'
                                    ? 'bg-white text-stone-900 font-semibold shadow-xs'
                                    : 'text-stone-500 hover:text-stone-900'
                            )}
                        >
                            All Payments
                        </button>
                        <button
                            type="button"
                            onClick={() => setPaymentStatusFilter('pending')}
                            className={cn(
                                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                                paymentStatusFilter === 'pending'
                                    ? 'bg-white text-stone-900 font-semibold shadow-xs'
                                    : 'text-stone-500 hover:text-stone-900'
                            )}
                        >
                            Pending
                        </button>
                        <button
                            type="button"
                            onClick={() => setPaymentStatusFilter('completed')}
                            className={cn(
                                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                                paymentStatusFilter === 'completed'
                                    ? 'bg-white text-stone-900 font-semibold shadow-xs'
                                    : 'text-stone-500 hover:text-stone-900'
                            )}
                        >
                            Paid
                        </button>
                    </div>

                    {(dateFilter || methodFilter !== 'all' || paymentStatusFilter !== 'all' || searchQuery) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setDateFilter('');
                                setMethodFilter('all');
                                setPaymentStatusFilter('all');
                                setSearchQuery('');
                            }}
                            className="text-xs text-stone-500 h-8 px-2"
                        >
                            Reset
                        </Button>
                    )}
                </div>
            </div>

            <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-stone-50/70">
                        <TableRow>
                            <TableHead className="font-bold text-stone-700">Order ID</TableHead>
                            <TableHead className="font-bold text-stone-700">Customer</TableHead>
                            <TableHead className="font-bold text-stone-700">Date</TableHead>
                            <TableHead className="font-bold text-stone-700">Order Status</TableHead>
                            <TableHead className="font-bold text-stone-700">Payment</TableHead>
                            <TableHead className="font-bold text-stone-700">Refund</TableHead>
                            <TableHead className="text-right font-bold text-stone-700">Total</TableHead>
                            <TableHead className="text-right font-bold text-stone-700">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center h-32 text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center space-y-2">
                                        <Search className="h-8 w-8 text-stone-300" />
                                        <p>No orders found matching your criteria.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredOrders.map((order) => {
                                const isCOD = Boolean(order.payment_id?.startsWith('COD'));

                                return (
                                    <TableRow key={order.id} className="group hover:bg-stone-50/50 transition-colors">
                                        <TableCell className="font-medium text-deep-forest group-hover:text-raw-clay transition-colors">
                                            #{order.order_number}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{order.profiles?.full_name || 'Guest'}</span>
                                                <span className="text-xs text-muted-foreground">{order.profiles?.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-stone-600">{formatDate(order.created_at)}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(order.status)} className="capitalize">
                                                {order.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {/* Payment Method Chip */}
                                                {isCOD ? (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wider text-stone-600 bg-stone-100 border border-stone-200 shrink-0">
                                                        COD
                                                    </span>
                                                ) : order.payment_id ? (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wider text-stone-600 bg-stone-100 border border-stone-200 shrink-0">
                                                        Online
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-stone-300 select-none shrink-0">—</span>
                                                )}

                                                {/* Sleek Payment Status Dropdown */}
                                                <PaymentStatusDropdown
                                                    orderId={order.id}
                                                    currentPaymentStatus={order.payment_status}
                                                    isCOD={isCOD}
                                                    compact={true}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {order.refund_status && order.refund_status !== 'none' ? (
                                                <Badge variant={getRefundStatusVariant(order.refund_status)} className="capitalize">
                                                    {order.refund_status}
                                                </Badge>
                                            ) : (
                                                <span className="text-stone-300">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-deep-forest">{formatPrice(order.total)}</TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/admin/orders/${order.id}`}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-500 hover:text-stone-900">
                                                    <Eye className="h-4 w-4" />
                                                    <span className="sr-only">View</span>
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
