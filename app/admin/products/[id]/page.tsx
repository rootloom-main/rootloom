import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProductForm } from '../_components/product-form';

export default async function EditProductPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const { id } = params;

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect('/auth/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') redirect('/');

    // Fetch product with variants and images
    const { data: product, error } = await supabase
        .from('products')
        .select(`
            *,
            product_variants (*),
            product_images (*)
        `)
        .eq('id', id)
        .single();

    if (error || !product) {
        redirect('/admin/products');
    }

    const { data: categories } = await supabase.from('categories').select('*');

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Edit Product</h1>
            <ProductForm initialData={product} categories={categories || []} />
        </div>
    );
}
