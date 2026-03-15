import { ProductService } from '@/lib/services/productService';
import { HomeSectionRenderer } from '@/components/home/home-section-renderer';
import { HeroSection } from '@/components/home/hero-section';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 0; // Disable cache for real-time layout updates

export default async function Home() {
    const supabase = await createClient();

    // Fetch dynamic sections and initial data in parallel
    const [sectionsRes, categories, featuredProducts, activeBanners] = await Promise.all([
        (supabase.from('home_sections' as unknown as any) as any).select('id, type, title, subtitle, active, display_order, config').eq('active', true).order('display_order', { ascending: true }),
        ProductService.getCategories(),
        ProductService.getFeaturedProducts(8),
        (supabase.from('banners' as unknown as any) as any).select('id, title, description, image_url, link, position, metadata, collections(slug)').eq('active', true).order('display_order', { ascending: false }).then((res: any) => res.data || []),
    ]);

    const sections = sectionsRes.data || [];
    
    // Preparation for standard sections
    const heroBanners = activeBanners.filter((b: any) => b.position === 'hero');
    const topPromo = activeBanners.find((b: any) => b.position === 'promo_top');
    const bottomPromo = activeBanners.find((b: any) => b.position === 'promo_bottom');

    const data = {
        categories,
        featuredProducts,
        heroBanners,
        topPromo,
        bottomPromo
    };

    // Check if home_sections has a HERO entry — if not, render hero directly
    const hasHeroSection = sections.some((s: any) => s.type === 'HERO');

    return (
        <div>
            {!hasHeroSection && <HeroSection heroBanners={heroBanners} />}
            <HomeSectionRenderer sections={sections} data={data} />
        </div>
    );
}
