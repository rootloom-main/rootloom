import { createClient } from '@/lib/supabase/server';
import { getCache, setCache } from '@/lib/redis';

export async function getRelatedProducts(productId: string, categoryId: string | null) {
    if (!categoryId) return [];

    const cacheKey = `recommendations:related:${categoryId}:${productId}:4`;
    const cached = await getCache<any[]>(cacheKey);
    if (cached) return cached;

    const supabase = await createClient();

    const { data: products, error } = await supabase
        .from('products')
        .select(`
            id,
            name,
            slug,
            base_price,
            product_images (image_url, alt_text)
        `)
        .eq('category_id', categoryId)
        .neq('id', productId)
        .limit(4);

    if (error) {
        console.error('Related Products Error:', error);
        return [];
    }

    if (products) {
        await setCache(cacheKey, products, 3600); // 1 hour
    }
    return products || [];
}
