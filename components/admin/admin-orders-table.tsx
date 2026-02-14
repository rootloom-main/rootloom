'use client';

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
import { Eye } from 'lucide-react';
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
        <div className="rounded-md border">
            <Table>
                <TableHeader>
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
                    {orders.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                No orders found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        orders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">#{order.order_number}</TableCell>
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
    );
}
