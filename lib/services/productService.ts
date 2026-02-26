import { createClient } from '@/lib/supabase/server';
import { getCache, setCache } from '@/lib/redis';

/**
 * ProductService encapsulates business logic and Upstash Redis caching
 * for products and categories data fetching.
 */
export const ProductService = {
    async getCategories() {
        const cacheKey = 'categories:all';
        const cached = await getCache<any[]>(cacheKey);
        if (cached) return cached;

        const supabase = await createClient();
        const { data, error } = await supabase.from('categories').select('*').order('name');

        if (error) {
            console.error('Failed to fetch categories:', error);
            return [];
        }

        if (data) {
            // Cache for 1 hour
            await setCache(cacheKey, data, 3600);
        }
        return data || [];
    },

    async getProducts(params?: { categorySlug?: string; search?: string; limit?: number }) {
        const cacheKey = `products:search:${JSON.stringify(params || {})}`;
        const cached = await getCache<any[]>(cacheKey);
        if (cached) return cached;

        const supabase = await createClient();
        let query = supabase.from('products').select(`
      *,
      category:categories(name, slug),
      product_images(image_url, alt_text, display_order),
      product_variants(id, size, color, stock, price_adjustment)
    `);

        if (params?.categorySlug) {
            const { data: cat } = await supabase.from('categories').select('id').eq('slug', params.categorySlug).single();
            if (cat) query = query.eq('category_id', cat.id);
        }

        if (params?.search) {
            query = query.ilike('name', `%${params.search}%`);
        }

        if (params?.limit) {
            query = query.limit(params.limit);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Failed to fetch products:', error);
            return [];
        }

        if (data) {
            // Cache for 15 minutes
            await setCache(cacheKey, data, 900);
        }
        return data || [];
    },

    async getProductBySlug(slug: string) {
        const cacheKey = `product:slug:${slug}`;
        const cached = await getCache<any>(cacheKey);
        if (cached) return cached;

        const supabase = await createClient();
        const { data, error } = await supabase
            .from('products')
            .select(`
        *,
        category:categories(name, slug),
        product_images(id, image_url, alt_text, display_order),
        product_variants(id, size, color, stock, price_adjustment, sku)
      `)
            .eq('slug', slug)
            .single();

        if (error) return null;

        if (data) {
            // Cache for 30 minutes
            await setCache(cacheKey, data, 1800);
        }
        return data;
    }
};
