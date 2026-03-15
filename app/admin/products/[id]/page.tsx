import { createSSRClient } from '@/lib/utils/auth';
import { getCurrentUser } from '@/lib/utils/auth';
import { redirect } from 'next/navigation';
import { ProductForm } from '../_components/product-form';

export default async function EditProductPage({ params }: { params: { id: string } }) {
    const supabase = await createSSRClient() as any;
    const { id } = params;

    const user = await getCurrentUser();

    if (!user) redirect('/auth/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') redirect('/');

    // Fetch product with variants, images, and collection links
    const { data: product, error } = await supabase
        .from('products')
        .select(`
            *,
            product_variants (*),
            product_images (*),
            collection_products (collection_id)
        `)
        .eq('id', id)
        .single();

    if (error || !product) {
        redirect('/admin/products');
    }

    const { data: categories } = await supabase.from('categories').select('*');
    const { data: collections } = await (supabase.from('collections') as any).select('id, name').eq('is_active', true);

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Edit Product</h1>
            <ProductForm 
                initialData={product} 
                categories={categories || []} 
                collections={collections || []}
            />
        </div>
    );
}
