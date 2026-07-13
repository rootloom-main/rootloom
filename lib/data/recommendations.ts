import { createAdminClient } from '@/lib/supabase/admin';
import { getCache, setCache } from '@/lib/redis';
import { profileAsync } from '@/lib/observability';

export async function getRelatedProducts(productId: string, categoryId: string | null) {
    if (!categoryId) return [];

    const cacheKey = `recommendations:related:${categoryId}:${productId}:4`;
    const cached = await getCache<any[]>(cacheKey);
    if (cached) return cached;

    const supabase = createAdminClient();

    const { data: products, error } = await profileAsync<any>(
        'recommendations.related',
        async () => supabase
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
        .eq('status', 'active')
        .is('deleted_at', null)
        .limit(4),
        { cache_key: cacheKey, category_id: categoryId }
    );

    if (error) {
        console.error('Related Products Error:', error);
        return [];
    }

    if (products) {
        await setCache(cacheKey, products, 3600); // 1 hour
    }
    return products || [];
}
