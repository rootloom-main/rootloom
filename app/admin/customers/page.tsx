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
import { formatDate } from '@/lib/utils/format';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default async function AdminCustomersPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect('/auth/login');

    // Verify admin access
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        redirect('/');
    }

    // Fetch profiles with order counts
    // Note: This assumes a foreign key exists from orders.user_id to profiles.id
    const { data: customers, error } = await supabase
        .from('profiles')
        .select(`
      *,
      orders:orders(count)
    `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching customers:', error);
    }

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Customers</h1>
                <p className="text-gray-500">View registered users and their activity.</p>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Orders</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {customers?.map((customer: any) => (
                            <TableRow key={customer.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback className="text-xs">
                                                {(customer.email?.[0] || 'U').toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{customer.full_name || 'No Name'}</span>
                                            <span className="text-xs text-muted-foreground">{customer.email}</span>
                                            {customer.phone && <span className="text-xs text-muted-foreground">{customer.phone}</span>}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="capitalize text-sm">{customer.role}</span>
                                </TableCell>
                                <TableCell>{formatDate(customer.created_at)}</TableCell>
                                <TableCell className="text-right">
                                    {customer.orders?.[0]?.count || 0}
                                </TableCell>
                            </TableRow>
                        ))}
                        {(!customers || customers.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    No customers found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
