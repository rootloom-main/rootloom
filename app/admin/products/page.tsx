import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSSRClient } from '@/lib/utils/auth';
import { getCurrentUser } from '@/lib/utils/auth';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AdminProductsTable } from '@/components/admin/admin-products-table';

export const dynamic = 'force-dynamic';

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

    // Fetch Products with Categories and Collection links
    const { data: products, error } = await supabase
        .from('products')
        .select(`
            *,
            categories(name),
            collection_products(collection_id)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }) as { data: any[] | null; error: any };

    const { data: collections } = await (supabase.from('collections') as any).select('id, name').eq('is_active', true);

    if (error) {
        console.error('Error fetching products:', error);
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Products</h1>
                    <p className="text-stone-500">Manage your jewelry and heirloom inventory.</p>
                </div>
                <Link href="/admin/products/new">
                    <Button className="bg-deep-forest hover:bg-deep-forest/90 text-white shadow-sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Product
                    </Button>
                </Link>
            </div>

            <AdminProductsTable 
                products={products || []} 
                collections={collections || []} 
            />
        </div>
    );
}
