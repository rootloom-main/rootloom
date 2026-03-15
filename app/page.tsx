import { ProductService } from '@/lib/services/productService';
import { HomeSectionRenderer } from '@/components/home/home-section-renderer';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 0; // Disable cache for real-time layout updates

export default async function Home() {
    const supabase = await createClient();

    // Fetch dynamic sections and initial data in parallel
    const [sectionsRes, categories, featuredProducts, activeBanners] = await Promise.all([
        supabase.from('home_sections').select('*').eq('active', true).order('display_order', { ascending: true }),
        ProductService.getCategories(),
        ProductService.getFeaturedProducts(8),
        supabase.from('banners').select('*, collections(slug)').eq('active', true).order('display_order', { ascending: false }).then(res => res.data || []),
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

    return (
        <div>
            <HomeSectionRenderer sections={sections} data={data} />
        </div>
    );
}

