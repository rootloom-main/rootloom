/**
 * Enterprise Phase 5: Headless CMS Adapter
 * 
 * A generic, provider-agnostic CMS interface designed for decoupling
 * marketing content (hero banners, featured collections, landing pages)
 * from the transactional codebase.
 * 
 * Supported backends: Sanity, Contentful, PayloadCMS, or any JSON API.
 */

// =============================================
// CMS Content Types
// =============================================

export interface CMSImage {
    url: string;
    alt: string;
    width?: number;
    height?: number;
}

export interface CMSHeroBanner {
    id: string;
    title: string;
    subtitle?: string;
    ctaText: string;
    ctaLink: string;
    backgroundImage: CMSImage;
    isActive: boolean;
    priority: number;
}

export interface CMSFeaturedCollection {
    id: string;
    title: string;
    description?: string;
    slug: string;
    image: CMSImage;
    productSlugs: string[]; // References to product slugs in Supabase
}

export interface CMSPromoBar {
    id: string;
    text: string;
    link?: string;
    backgroundColor: string;
    textColor: string;
    isActive: boolean;
}

export interface CMSPage {
    id: string;
    slug: string;
    title: string;
    metaDescription?: string;
    content: string; // Rich text / HTML
    publishedAt: string;
}

// =============================================
// CMS Provider Interface
// =============================================

export interface CMSProvider {
    name: string;

    // Hero Banners
    getHeroBanners(): Promise<CMSHeroBanner[]>;

    // Featured Collections
    getFeaturedCollections(): Promise<CMSFeaturedCollection[]>;

    // Promotional Bar
    getPromoBar(): Promise<CMSPromoBar | null>;

    // Static Pages (About, Terms, Privacy, etc.)
    getPage(slug: string): Promise<CMSPage | null>;
}

// =============================================
// Supabase CMS Provider (Default)
// =============================================

import { createClient } from '@/lib/supabase/server';
import { getCache, setCache } from '@/lib/redis';

export class SupabaseCMSProvider implements CMSProvider {
    name = 'supabase';

    async getHeroBanners(): Promise<CMSHeroBanner[]> {
        const cacheKey = 'cms:hero_banners';
        const cached = await getCache<CMSHeroBanner[]>(cacheKey);
        if (cached) return cached;

        const supabase = await createClient();
        const { data } = await supabase
            .from('banners')
            .select('*')
            .eq('is_active', true)
            .order('priority', { ascending: true });

        const banners: CMSHeroBanner[] = (data || []).map((b: any) => ({
            id: b.id,
            title: b.title,
            subtitle: b.subtitle,
            ctaText: b.cta_text || 'Shop Now',
            ctaLink: b.cta_link || '/shop',
            backgroundImage: {
                url: b.image_url,
                alt: b.title,
            },
            isActive: b.is_active,
            priority: b.priority || 0,
        }));

        await setCache(cacheKey, banners, 3600); // 1 hour
        return banners;
    }

    async getFeaturedCollections(): Promise<CMSFeaturedCollection[]> {
        const cacheKey = 'cms:featured_collections';
        const cached = await getCache<CMSFeaturedCollection[]>(cacheKey);
        if (cached) return cached;

        const supabase = await createClient();
        const { data } = await supabase
            .from('categories')
            .select('*')
            .limit(6);

        const collections: CMSFeaturedCollection[] = (data || []).map((c: any) => ({
            id: c.id,
            title: c.name,
            description: c.description,
            slug: c.slug,
            image: {
                url: c.image_url || '/placeholder.png',
                alt: c.name,
            },
            productSlugs: [],
        }));

        await setCache(cacheKey, collections, 3600);
        return collections;
    }

    async getPromoBar(): Promise<CMSPromoBar | null> {
        const cacheKey = 'cms:promo_bar';
        const cached = await getCache<CMSPromoBar>(cacheKey);
        if (cached) return cached;

        // Default promo bar from store settings
        const supabase = await createClient();
        const { data } = await supabase
            .from('store_settings')
            .select('*')
            .eq('key', 'promo_bar')
            .single();

        if (!data) return null;

        const promo: CMSPromoBar = {
            id: (data as any).key,
            text: (data as any).value?.text || '',
            link: (data as any).value?.link,
            backgroundColor: (data as any).value?.bg_color || '#1a1a2e',
            textColor: (data as any).value?.text_color || '#ffffff',
            isActive: (data as any).value?.is_active ?? true,
        };

        await setCache(cacheKey, promo, 1800); // 30 mins
        return promo;
    }

    async getPage(slug: string): Promise<CMSPage | null> {
        const cacheKey = `cms:page:${slug}`;
        const cached = await getCache<CMSPage>(cacheKey);
        if (cached) return cached;

        const supabase = await createClient();
        const { data } = await supabase
            .from('pages')
            .select('*')
            .eq('slug', slug)
            .single();

        if (!data) return null;

        const page: CMSPage = {
            id: (data as any).id,
            slug: (data as any).slug,
            title: (data as any).title,
            metaDescription: (data as any).meta_description || undefined,
            content: (data as any).content || '',
            publishedAt: (data as any).created_at,
        };

        await setCache(cacheKey, page, 3600);
        return page;
    }
}

// =============================================
// CMS Factory
// =============================================

let cmsInstance: CMSProvider | null = null;

/**
 * Get the active CMS provider.
 * Defaults to SupabaseCMSProvider.
 * Swap this factory to use Sanity/Contentful/PayloadCMS.
 */
export function getCMSProvider(): CMSProvider {
    if (!cmsInstance) {
        cmsInstance = new SupabaseCMSProvider();
    }
    return cmsInstance;
}

/**
 * Override the CMS provider (useful for testing or swapping to external CMS)
 */
export function setCMSProvider(provider: CMSProvider): void {
    cmsInstance = provider;
}
