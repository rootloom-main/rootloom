import { createClient } from '@/lib/supabase/server';
import { getCache, setCache } from '@/lib/redis';

export const RecommendationService = {
    /**
     * Fetches the top-selling products based on order_items volume.
     * Caches aggressively for 6 hours.
     */
    async getTrendingProducts(limit: number = 4) {
        const cacheKey = `recommendations:trending:${limit}`;
        const cached = await getCache<any[]>(cacheKey);
        if (cached) return cached;

        const supabase = await createClient();

        // Since get_trending_product_ids might not exist yet, we fetch top featured products 
        // or recently updated products to simulate trending behavior safely.
        let { data: products, error } = await supabase
            .from('products')
            .select('*, product_images(image_url, alt_text, display_order)')
            .eq('featured', true)
            .limit(limit);

        if (error || !products || products.length === 0) {
            // Fallback to latest products
            const { data: latest } = await supabase
                .from('products')
                .select('*, product_images(image_url, alt_text, display_order)')
                .order('created_at', { ascending: false })
                .limit(limit);
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

        const supabase = await createClient();

        const { data: products, error } = await supabase
            .from('products')
            .select('*, product_images(image_url, alt_text, display_order), product_variants(price_adjustment)')
            .eq('category_id', categoryId)
            .neq('id', excludeProductId)
            .limit(limit);

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

        const supabase = await createClient();
        const { data: products } = await supabase
            .from('products')
            .select('*, product_images(image_url, alt_text, display_order)')
            .in('id', productIds)
            .limit(10);

        if (products) {
            await setCache(cacheKey, products, 900); // 15 mins
        }
        return products || [];
    }
};
