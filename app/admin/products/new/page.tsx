import { createSSRClient } from '@/lib/utils/auth';
import { getCurrentUser } from '@/lib/utils/auth';
import { redirect } from 'next/navigation';
import { ProductForm } from '../_components/product-form';

export default async function NewProductPage() {
    const supabase = await createSSRClient() as any;
    const user = await getCurrentUser();

    if (!user) redirect('/auth/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') redirect('/');

    const { data: categories } = await supabase.from('categories').select('*');
    const { data: collections } = await (supabase.from('collections' as unknown as any)).select('id, name').eq('is_active', true);

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Add New Product</h1>
            <ProductForm 
                categories={categories || []} 
                collections={collections || []}
            />
        </div>
    );
}
