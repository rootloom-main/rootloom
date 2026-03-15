import { createSSRClient } from '@/lib/utils/auth';
import { getCurrentUser } from '@/lib/utils/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
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
    const supabase = await createSSRClient();
    const user = await getCurrentUser();

    if (!user) {
        redirect('/auth/login');
    }

    // Verify Admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single() as { data: any | null };

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        redirect('/');
    }

    // Fetch Returns
    const adminSupabase = createAdminClient();
    const { data: returns, error } = await adminSupabase
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

    if (error) {
        console.error('Error fetching returns:', error);
    } else {
        console.log('Fetched returns:', returns?.length);
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'requested': return 'default';
            case 'approved': return 'default'; // dark/green depending on theme
            case 'pickup_scheduled': return 'secondary';
            case 'picked_up': return 'secondary';
            case 'inspection_pending': return 'destructive'; // Requires action
            case 'accepted': return 'default';
            case 'refunded': return 'secondary';
            case 'refund_processed': return 'default'; // Success green
            case 'exchange_processed': return 'default';
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
                            <TableHead>Evidence</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {returns?.map((req: any) => (
                            <TableRow key={req.id}>
                                <TableCell className="font-medium">
                                    <Link href={`/admin/orders/${req.order_id}`} className="hover:underline text-deep-forest font-bold">
                                        #{req.order?.order_number}
                                    </Link>
                                </TableCell>
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
                                    {req.image_url ? (
                                        <a
                                            href={req.image_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group relative block h-12 w-12 overflow-hidden rounded-md border border-stone-200 hover:border-deep-forest transition-colors"
                                        >
                                            <img
                                                src={req.image_url}
                                                alt="Evidence"
                                                className="h-full w-full object-cover transition-transform group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-[10px] text-white font-bold">VIEW</span>
                                            </div>
                                        </a>
                                    ) : (
                                        <Badge variant="outline" className="text-stone-400 border-stone-200">No Photo</Badge>
                                    )}
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
                                                <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50" title="Approve Return">
                                                    <CheckCircle className="h-4 w-4" />
                                                </Button>
                                            </form>
                                            <form action={updateReturnStatus}>
                                                <input type="hidden" name="id" value={req.id} />
                                                <input type="hidden" name="status" value="rejected" />
                                                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" title="Reject Return">
                                                    <XCircle className="h-4 w-4" />
                                                </Button>
                                            </form>
                                        </div>
                                    )}
                                    {req.status === 'approved' && (
                                        <form action={updateReturnStatus}>
                                            <input type="hidden" name="id" value={req.id} />
                                            <input type="hidden" name="status" value="pickup_scheduled" />
                                            <Button size="sm" variant="secondary" className="gap-2 text-blue-600">
                                                Schedule Pickup
                                            </Button>
                                        </form>
                                    )}
                                    {req.status === 'pickup_scheduled' && (
                                        <form action={updateReturnStatus}>
                                            <input type="hidden" name="id" value={req.id} />
                                            <input type="hidden" name="status" value="picked_up" />
                                            <Button size="sm" variant="secondary" className="gap-2 text-indigo-600">
                                                Mark Picked Up
                                            </Button>
                                        </form>
                                    )}
                                    {req.status === 'picked_up' && (
                                        <form action={updateReturnStatus}>
                                            <input type="hidden" name="id" value={req.id} />
                                            <input type="hidden" name="status" value="inspection_pending" />
                                            <Button size="sm" variant="secondary" className="gap-2 text-amber-600">
                                                Receive at Warehouse
                                            </Button>
                                        </form>
                                    )}
                                    {req.status === 'inspection_pending' && (
                                        <div className="flex justify-end gap-2">
                                            <form action={updateReturnStatus}>
                                                <input type="hidden" name="id" value={req.id} />
                                                <input type="hidden" name="status" value="accepted" />
                                                <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50" title="Accept Condition">
                                                    Accept
                                                </Button>
                                            </form>
                                            <form action={updateReturnStatus}>
                                                <input type="hidden" name="id" value={req.id} />
                                                <input type="hidden" name="status" value="rejected" />
                                                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" title="Reject Condition">
                                                    Reject
                                                </Button>
                                            </form>
                                        </div>
                                    )}
                                    {req.status === 'accepted' && (
                                        <form action={updateReturnStatus}>
                                            <input type="hidden" name="id" value={req.id} />
                                            <input type="hidden" name="status" value={req.request_type === 'exchange' ? 'exchange_processed' : 'refund_processed'} />
                                            <Button size="sm" className="gap-2 bg-deep-forest hover:bg-deep-forest/90 text-white">
                                                <RefreshCcw className="h-4 w-4" />
                                                {req.request_type === 'exchange' ? 'Process Exchange' : 'Process Refund'}
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
