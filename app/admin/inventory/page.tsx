import { createSSRClient } from '@/lib/utils/auth';
import { getCurrentUser } from '@/lib/utils/auth';
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
import { AlertTriangle, CheckCircle } from 'lucide-react';

export default async function AdminInventoryPage() {
    const supabase = await createSSRClient();
    const user = await getCurrentUser();

    if (!user) {
        redirect('/auth/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single() as { data: any | null };

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        redirect('/');
    }

    // Fetch variants with product info
    const { data: variants, error } = await supabase
        .from('product_variants')
        .select(`
      *,
      product:products (name)
    `)
        .order('stock', { ascending: true }); // Show low stock first

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Inventory</h1>
                <p className="text-gray-500">Monitor stock levels across all product variants.</p>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Variant</TableHead>
                            <TableHead className="text-right">Stock Level</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {variants?.map((variant: any) => (
                            <TableRow key={variant.id}>
                                <TableCell className="font-medium">
                                    {variant.product?.name}
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-2">
                                        <Badge variant="outline">{variant.size}</Badge>
                                        <Badge variant="outline">{variant.color}</Badge>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {variant.stock}
                                </TableCell>
                                <TableCell className="text-right">
                                    {variant.stock < 5 ? (
                                        <div className="flex justify-end items-center text-amber-600">
                                            <AlertTriangle className="h-4 w-4 mr-1" /> Low
                                        </div>
                                    ) : (
                                        <div className="flex justify-end items-center text-green-600">
                                            <CheckCircle className="h-4 w-4 mr-1" /> OK
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {(!variants || variants.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    No inventory items found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
