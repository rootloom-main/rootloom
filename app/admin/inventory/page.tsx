import { createSSRClient } from '@/lib/utils/auth';
import { getCurrentUser } from '@/lib/utils/auth';
import { redirect } from 'next/navigation';
import { AdminInventoryTable } from '@/components/admin/admin-inventory-table';

export const dynamic = 'force-dynamic';

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

    const totalItems = variants?.reduce((acc: number, v: any) => acc + (v.stock || 0), 0) || 0;

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Inventory ({variants?.length || 0})</h1>
                <p className="text-gray-500">Monitor stock levels and search across all product variants. Total variants: {variants?.length || 0} ({totalItems} total units in stock).</p>
            </div>

            <AdminInventoryTable variants={variants || []} />
        </div>
    );
}
