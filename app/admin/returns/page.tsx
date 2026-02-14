import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatPrice } from '@/lib/utils/format';
import { CheckCircle, XCircle, RefreshCcw } from 'lucide-react';
import { updateReturnStatus } from './actions';

export default async function AdminReturnsPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect('/auth/login');

    // Verify Admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        redirect('/');
    }

    // Fetch Returns
    const { data: returns } = await supabase
        .from('returns')
        .select(`
      *,
      order:orders(order_number),
      product:order_items(
        price,
        product:products(name),
        variant:product_variants(size, color)
      ),
      user:profiles(full_name, email)
    `)
        .order('created_at', { ascending: false });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'default'; // dark/green depending on theme
            case 'refunded': return 'secondary';
            case 'rejected': return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Return Requests</h1>
                <p className="text-gray-500">Manage customer return requests and refunds.</p>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {returns?.map((req: any) => (
                            <TableRow key={req.id}>
                                <TableCell className="font-medium">#{req.order?.order_number}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span>{req.user?.full_name}</span>
                                        <span className="text-xs text-gray-500">{req.user?.email}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span>{req.product?.product?.name}</span>
                                        <span className="text-xs text-gray-500">
                                            {req.product?.variant?.size} / {req.product?.variant?.color}
                                        </span>
                                        <span className="text-xs font-semibold">{formatPrice(req.product?.price)}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate" title={req.reason}>
                                    {req.reason}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={getStatusColor(req.status)} className="capitalize">
                                        {req.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    {req.status === 'requested' && (
                                        <div className="flex justify-end gap-2">
                                            <form action={updateReturnStatus}>
                                                <input type="hidden" name="id" value={req.id} />
                                                <input type="hidden" name="status" value="approved" />
                                                <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                                                    <CheckCircle className="h-4 w-4" />
                                                </Button>
                                            </form>
                                            <form action={updateReturnStatus}>
                                                <input type="hidden" name="id" value={req.id} />
                                                <input type="hidden" name="status" value="rejected" />
                                                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                                    <XCircle className="h-4 w-4" />
                                                </Button>
                                            </form>
                                        </div>
                                    )}
                                    {req.status === 'approved' && (
                                        <form action={updateReturnStatus}>
                                            <input type="hidden" name="id" value={req.id} />
                                            <input type="hidden" name="status" value="refunded" />
                                            <Button size="sm" variant="secondary" className="gap-2">
                                                <RefreshCcw className="h-4 w-4" /> Refund
                                            </Button>
                                        </form>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {(!returns || returns.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No return requests found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
