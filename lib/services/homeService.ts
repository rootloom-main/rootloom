import { createClient } from '@/lib/supabase/server';
import { getCache, setCache } from '@/lib/redis';

export const HomeService = {
    async getSections() {
        const cacheKey = 'home:sections';
        const cached = await getCache<any[]>(cacheKey);
        if (cached) return cached;

        const supabase = await createClient();
        const { data, error } = await (supabase.from('home_sections' as any) as any)
            .select('id, type, title, subtitle, active, display_order, config')
            .eq('active', true)
            .order('display_order', { ascending: true });

        if (error) return [];
        if (data) await setCache(cacheKey, data, 3600); // 1 hour
        return data || [];
    },

    async getBanners() {
        const cacheKey = 'home:banners';
        const cached = await getCache<any[]>(cacheKey);
        if (cached) return cached;

        const supabase = await createClient();
        const { data, error } = await (supabase.from('banners' as any) as any)
            .select('id, title, description, image_url, link, position, metadata, collections(slug)')
            .eq('active', true)
            .order('display_order', { ascending: false });

        if (error) return [];
        if (data) await setCache(cacheKey, data, 3600); // 1 hour
        return data || [];
    }
};
