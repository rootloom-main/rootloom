import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProductForm } from '../_components/product-form';

export default async function NewProductPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect('/auth/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') redirect('/');

    const { data: categories } = await supabase.from('categories').select('*');

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Add New Product</h1>
            <ProductForm categories={categories || []} />
        </div>
    );
}
