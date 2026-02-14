import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rootloom.vercel.app';
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Static routes that always exist
    const staticRoutes = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 1,
        },
        {
            url: `${baseUrl}/shop`,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 0.9,
        },
        {
            url: `${baseUrl}/about`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.5,
        },
    ];

    if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase credentials missing, generating static sitemap only');
        return staticRoutes;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all products
    const { data: products } = await supabase
        .from('products')
        .select('slug, updated_at');

    // Fetch all categories
    const { data: categories } = await supabase
        .from('categories')
        .select('slug, created_at');

    const productUrls = (products || []).map((product) => ({
        url: `${baseUrl}/product/${product.slug}`,
        lastModified: new Date(product.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }));

    const categoryUrls = (categories || []).map((category) => ({
        url: `${baseUrl}/shop?category=${category.slug}`,
        lastModified: new Date(category.created_at || new Date()), // Fallback
        changeFrequency: 'weekly' as const,
        priority: 0.6,
    }));

    return [...staticRoutes, ...productUrls, ...categoryUrls];
}
