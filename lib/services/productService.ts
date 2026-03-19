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
        const { data, error } = await supabase.from('categories').select('id, name, slug, image_url').order('name');

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

    async getProducts(params?: {
        categorySlug?: string;
        search?: string;
        limit?: number;
        minPrice?: number;
        maxPrice?: number;
        sortBy?: string;
    }) {
        const cacheKey = `products:filtered:${JSON.stringify(params || {})}`;
        const cached = await getCache<any[]>(cacheKey);
        if (cached) return cached;

        const supabase = await createClient();
        
        // Handle Fuzzy Search via RPC if query present
        if (params?.search) {
            // First, find matching IDs using the typo-tolerant RPC
            const { data: searchResults, error: searchError } = await supabase.rpc('search_products', {
                query_text: params.search,
                filter_category_id: params?.categorySlug && params.categorySlug !== 'all' ? (await supabase.from('categories').select('id').eq('slug', params.categorySlug).single()).data?.id : null,
                min_price: params?.minPrice,
                max_price: params?.maxPrice,
                sort_by: params?.sortBy === 'latest' ? 'newest' : (params?.sortBy === 'price-asc' ? 'price_asc' : (params?.sortBy === 'price-desc' ? 'price_desc' : 'relevance')),
                limit_count: params?.limit || 50,
                offset_count: 0
            } as any);

            if (searchError) {
                console.error('Search RPC Error:', searchError);
            } else if (searchResults && searchResults.length > 0) {
                const ids = searchResults.map((r: any) => r.id);
                // Fetch full product details for these matching IDs
                const { data: fullProducts, error: fullError } = await supabase
                    .from('products')
                    .select(`
                        id, name, slug, base_price,
                        category:categories(name, slug),
                        product_images(image_url, alt_text, display_order),
                        product_variants(id, size, color, stock, price_adjustment)
                    `)
                    .is('deleted_at', null)
                    .in('id', ids);
                
                if (fullError) return [];
                
                // Re-sort to match RPC relevance order
                const sorted = ids.map(id => fullProducts.find(p => p.id === id)).filter(Boolean);
                
                if (sorted.length > 0) {
                    await setCache(cacheKey, sorted, 900);
                    return sorted;
                }
            }
            
            // If no results from RPC, fall back to ilike or return empty (RPC is better)
            if (!searchResults || searchResults.length === 0) return [];
        }

        let query = supabase.from('products').select(`
          id, name, slug, base_price,
          category:categories!inner(name, slug),
          product_images(image_url, alt_text, display_order),
          product_variants(id, size, color, stock, price_adjustment)
        `).is('deleted_at', null);

        if (params?.categorySlug && params.categorySlug !== 'all') {
            query = query.eq('category.slug', params.categorySlug);
        }

        if (params?.minPrice !== undefined) {
            query = query.gte('base_price', params.minPrice);
        }

        if (params?.maxPrice !== undefined) {
            query = query.lte('base_price', params.maxPrice);
        }

        switch (params?.sortBy) {
            case 'price-asc':
                query = query.order('base_price', { ascending: true });
                break;
            case 'price-desc':
                query = query.order('base_price', { ascending: false });
                break;
            case 'name':
                query = query.order('name', { ascending: true });
                break;
            default:
                query = query.order('created_at', { ascending: false });
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
        id, name, slug, description, base_price, metadata,
        category:categories(name, slug),
        product_images(id, image_url, alt_text, display_order),
        product_variants(id, size, color, stock, price_adjustment, sku)
      `)
            .eq('slug', slug)
            .is('deleted_at', null)
            .single();

        if (error) return null;

        if (data) {
            // Cache for 30 minutes
            await setCache(cacheKey, data, 1800);
        }
        return data;
    },

    async getNewArrivals(limit: number = 8, categorySlug?: string) {
        const cacheKey = `products:new-arrivals:${limit}:${categorySlug || 'all'}`;
        const cached = await getCache<any[]>(cacheKey);
        if (cached) return cached;

        const supabase = await createClient();
        let query = supabase
            .from('products')
            .select(`
                id, name, slug, base_price, 
                product_images(image_url, alt_text), 
                product_variants(id, size, color, stock, price_adjustment),
                category:categories!inner(slug)
            `)
            .is('deleted_at', null);
        
        if (categorySlug) {
            query = query.eq('category.slug', categorySlug);
        }

        const { data, error } = await query
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Failed to fetch new arrivals:', error);
            return [];
        }
        if (data) await setCache(cacheKey, data, 900); // 15 mins
        return data || [];
    },

    async getBestSellers(limit: number = 8, categorySlug?: string) {
        const cacheKey = `products:best-sellers:${limit}:${categorySlug || 'all'}`;
        const cached = await getCache<any[]>(cacheKey);
        if (cached) return cached;

        const supabase = await createClient();
        let query = supabase
            .from('products')
            .select(`
                id, name, slug, base_price, 
                product_images(image_url, alt_text), 
                product_variants(id, size, color, stock, price_adjustment),
                category:categories!inner(slug)
            `)
            .is('deleted_at', null);

        if (categorySlug) {
            query = query.eq('category.slug', categorySlug);
        }

        const { data, error } = await query
            .order('sales_count', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Failed to fetch best sellers:', error);
            return [];
        }
        if (data) await setCache(cacheKey, data, 900); // 15 mins
        return data || [];
    },

    async getFeaturedProducts(limit: number = 8) {
        const cacheKey = `products:featured:${limit}`;
        const cached = await getCache<any[]>(cacheKey);
        if (cached) return cached;

        const supabase = await createClient();
        const { data, error } = await supabase
            .from('products')
            .select('id, name, slug, base_price, product_images(image_url, alt_text), product_variants(id, size, color, stock, price_adjustment)')
            .eq('featured', true)
            .is('deleted_at', null)
            .limit(limit);

        if (error) return [];
        if (data) await setCache(cacheKey, data, 900); // 15 mins
        return data || [];
    }
};
