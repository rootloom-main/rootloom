import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { cache } from 'react';

// Cache the result of this function for the lifetime of the request
export const getProducts = cache(async (limit = 10) => {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('products')
            .select(`
        *,
        product_images (image_url, alt_text),
        category:categories (name, slug)
      `)
            .limit(limit);

        if (error) {
            logger.error('Error fetching products', { error: error.message });
            throw new Error(error.message);
        }

        return data;
    } catch (error: any) {
        logger.error('DAL Error: getProducts', { error: error.message });
        return [];
    }
});

export const getProductBySlug = cache(async (slug: string) => {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('products')
            .select(`
        *,
        product_images (image_url, alt_text),
        category:categories (name, slug),
        variants:product_variants (*)
      `)
            .eq('slug', slug)
            .single();

        if (error) {
            logger.error('Error fetching product by slug', { slug, error: error.message });
            return null;
        }

        return data;
    } catch (error: any) {
        logger.error('DAL Error: getProductBySlug', { slug, error: error.message });
        return null;
    }
});
