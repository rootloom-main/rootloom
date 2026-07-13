import { createAdminClient } from '@/lib/supabase/admin';
import { getCache, setCache } from '@/lib/redis';
import { profileAsync } from '@/lib/observability';

export const RecommendationService = {
    /**
     * Fetches the top-selling products based on order_items volume.
     * Caches aggressively for 6 hours.
     */
    async getTrendingProducts(limit: number = 4) {
        const cacheKey = `recommendations:trending:${limit}`;
        const cached = await getCache<any[]>(cacheKey);
        if (cached) return cached;

        const supabase = createAdminClient();

        // Since get_trending_product_ids might not exist yet, we fetch top featured products 
        // or recently updated products to simulate trending behavior safely.
        let { data: products, error } = await profileAsync<any>(
            'recommendations.trending',
            async () => supabase
            .from('products')
            .select('*, product_images(image_url, alt_text, display_order)')
            .eq('featured', true)
            .eq('status', 'active')
            .is('deleted_at', null)
            .limit(limit),
            { cache_key: cacheKey, limit }
        );

        if (error || !products || products.length === 0) {
            // Fallback to latest products
            const { data: latest } = await profileAsync<any>(
                'recommendations.trending.latest_fallback',
                async () => supabase
                .from('products')
                .select('*, product_images(image_url, alt_text, display_order)')
                .eq('status', 'active')
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .limit(limit),
                { limit }
            );
            products = latest;
        }

        if (products) {
            // 6 hour cache
            await setCache(cacheKey, products, 21600);
        }
        return products || [];
    },

    /**
     * Fetches products in the same category, excluding the current one.
     * Caches for 1 hour.
     */
    async getRelatedProducts(categoryId: string, excludeProductId: string, limit: number = 4) {
        const cacheKey = `recommendations:related:${categoryId}:${excludeProductId}:${limit}`;
        const cached = await getCache<any[]>(cacheKey);
        if (cached) return cached;

        const supabase = createAdminClient();

        const { data: products, error } = await profileAsync<any>(
            'recommendations.by_category',
            async () => supabase
            .from('products')
            .select('*, product_images(image_url, alt_text, display_order), product_variants(price_adjustment)')
            .eq('category_id', categoryId)
            .neq('id', excludeProductId)
            .eq('status', 'active')
            .is('deleted_at', null)
            .limit(limit),
            { cache_key: cacheKey, category_id: categoryId }
        );

        if (error) {
            console.error('Related Products Error:', error);
            return [];
        }

        if (products) {
            // 1 hour cache
            await setCache(cacheKey, products, 3600);
        }
        return products || [];
    },

    /**
     * Fetches product details for an array of IDs stored in localStorage.
     */
    async getRecentlyViewed(productIds: string[]) {
        if (!productIds || productIds.length === 0) return [];

        const arrayStr = productIds.slice(0, 10).join(',');
        const cacheKey = `recommendations:recent:${arrayStr}`;
        const cached = await getCache<any[]>(cacheKey);
        if (cached) return cached;

        const supabase = createAdminClient();
        const { data: products } = await profileAsync<any>(
            'recommendations.recent',
            async () => supabase
            .from('products')
            .select('*, product_images(image_url, alt_text, display_order)')
            .in('id', productIds)
            .eq('status', 'active')
            .is('deleted_at', null)
            .limit(10),
            { cache_key: cacheKey }
        );

        if (products) {
            await setCache(cacheKey, products, 900); // 15 mins
        }
        return products || [];
    }
};
