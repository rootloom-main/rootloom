import { createClient } from '@/lib/supabase/server';

export async function getRelatedProducts(productId: string, embedding: number[]) {
    const supabase = await createClient();

    if (!embedding || embedding.length === 0) {
        return [];
    }

    try {
        const { data, error } = await supabase.rpc('match_products', {
            query_embedding: embedding, // Supabase JS handles number[] for vector
            match_threshold: 0.5, // similarity threshold
            match_count: 4,
            current_product_id: productId
        });

        if (error) {
            console.error('Error fetching related products:', error);
            // Fallback: Fetch by category if embedding fails?
            // For now, return empty
            return [];
        }

        // Fetch full product details including images for the matched IDs
        if (data && data.length > 0) {
            const ids = data.map((p: any) => p.id);
            const { data: productsWithImages } = await supabase
                .from('products')
                .select(`
                    id,
                    name,
                    slug,
                    base_price,
                    product_images (image_url, alt_text)
                `)
                .in('id', ids);

            return productsWithImages || [];
        }

        return [];
    } catch (err) {
        console.error('Unexpected error in getRelatedProducts:', err);
        return [];
    }
}
