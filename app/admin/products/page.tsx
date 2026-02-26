import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSSRClient } from '@/lib/utils/auth';
import { getCurrentUser } from '@/lib/utils/auth';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ProductActions } from './product-actions';
import { formatPrice } from '@/lib/utils/format';

export default async function AdminProductsPage() {
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

    // Fetch Products
    const { data: products, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false }) as { data: any[] | null; error: any };

    if (error) {
        console.error('Error fetching products:', error);
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">Active</span>;
            case 'draft': return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs">Draft</span>;
            case 'archived': return <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs">Archived</span>;
            default: return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs">{status}</span>;
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Products</h1>
                <Link href="/admin/products/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Product
                    </Button>
                </Link>
            </div>

            <div className="border rounded-lg overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Featured</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products?.map((product) => (
                            <TableRow key={product.id}>
                                <TableCell className="font-medium">
                                    <div className="flex flex-col">
                                        <span>{product.name}</span>
                                        {/* <span className="text-xs text-gray-400">{product.slug}</span> */}
                                    </div>
                                </TableCell>
                                <TableCell>{Array.isArray(product.categories) ? product.categories[0]?.name : product.categories?.name || 'Uncategorized'}</TableCell>
                                <TableCell>{formatPrice(product.base_price)}</TableCell>
                                <TableCell>{getStatusBadge(product.status)}</TableCell>
                                <TableCell>{product.featured ? 'Yes' : 'No'}</TableCell>
                                <TableCell>
                                    <ProductActions productId={product.id} />
                                </TableCell>
                            </TableRow>
                        ))}
                        {(!products || products.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                    No products found. Click &quot;Add Product&quot; to create one.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
