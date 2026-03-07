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
import { Eye, Search, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatPrice } from '@/lib/utils/format';

interface Order {
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    total: number;
    created_at: string;
    profiles: {
        email: string;
        full_name: string | null;
    } | null;
}

interface AdminOrdersTableProps {
    orders: Order[];
}

export function AdminOrdersTable({ orders }: AdminOrdersTableProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState(''); // Simple string match for YYYY-MM-DD for now.

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) || order.id.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDate = dateFilter ? order.created_at.startsWith(dateFilter) : true;
            return matchesSearch && matchesDate;
        });
    }, [orders, searchQuery, dateFilter]);

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'delivered': return 'default'; // Greenish usually or black
            case 'shipped': return 'secondary';
            case 'processing': return 'secondary';
            case 'cancelled': return 'destructive';
            default: return 'outline';
        }
    };

    const getPaymentStatusVariant = (status: string) => {
        return status === 'completed' ? 'default' : 'destructive';
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <Input
                        placeholder="Search by Order ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-white border-stone-200"
                    />
                </div>
                <div className="relative w-full sm:w-auto flex items-center gap-2">
                    <div className="relative">
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                        <Input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="pl-9 bg-white border-stone-200 text-stone-600"
                            title="Filter by Date"
                        />
                    </div>
                    {dateFilter && (
                        <Button variant="ghost" size="sm" onClick={() => setDateFilter('')} className="text-xs text-stone-500">
                            Clear Date
                        </Button>
                    )}
                </div>
            </div>

            <div className="rounded-md border bg-white overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-stone-50/50">
                        <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Payment</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center space-y-2">
                                        <Search className="h-8 w-8 text-stone-300" />
                                        <p>No orders found matching your criteria.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredOrders.map((order) => (
                                <TableRow key={order.id} className="group hover:bg-stone-50/50 transition-colors">
                                    <TableCell className="font-medium text-deep-forest group-hover:text-raw-clay transition-colors">#{order.order_number}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{order.profiles?.full_name || 'Guest'}</span>
                                            <span className="text-xs text-muted-foreground">{order.profiles?.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{formatDate(order.created_at)}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(order.status)} className="capitalize">
                                            {order.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getPaymentStatusVariant(order.payment_status)} className="capitalize">
                                            {order.payment_status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{formatPrice(order.total)}</TableCell>
                                    <TableCell className="text-right">
                                        <Link href={`/admin/orders/${order.id}`}>
                                            <Button variant="ghost" size="icon">
                                                <Eye className="h-4 w-4" />
                                                <span className="sr-only">View</span>
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
