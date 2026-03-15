'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CollectionForm } from '../../_components/collection-form';
import { Loader2 } from 'lucide-react';

export default function EditCollectionPage() {
    const params = useParams();
    const router = useRouter();
    const [collection, setCollection] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchCollectionData = async () => {
            // 1. Fetch Collection
            const { data: colData, error: colError } = await supabase
                .from('collections')
                .select('*')
                .eq('id', params?.id)
                .single();

            if (colError || !colData) {
                router.push('/admin/marketing/collections');
                return;
            }

            // 2. Fetch Assigned Products
            const { data: mappingData } = await supabase
                .from('collection_products')
                .select(`
                    product_id,
                    products (
                        id, 
                        name, 
                        slug, 
                        base_price, 
                        product_images(image_url)
                    )
                `)
                .eq('collection_id', params?.id)
                .order('display_order', { ascending: true });

            const assignedProducts = mappingData?.map((m: any) => m.products).filter(Boolean) || [];

            setCollection(colData);
            setProducts(assignedProducts);
            setLoading(false);
        };

        fetchCollectionData();
    }, [params?.id]);

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-slate-300" /></div>;

    return (
        <div className="container mx-auto px-6 py-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">Edit Collection</h1>
            <CollectionForm initialData={collection} productsInCollection={products} />
        </div>
    );
}
