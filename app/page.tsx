import { ProductService } from '@/lib/services/productService';
import { HomeService } from '@/lib/services/homeService';
import { HomeSectionRenderer } from '@/components/home/home-section-renderer';
import HeroSection from '@/components/home/hero-section';

export const revalidate = 3600; // Cache for 1 hour in production
import FAQSection from '@/components/home/faq-section';

export default async function Home() {
    // Fetch dynamic sections and initial data in parallel
    const [sections, categories, featuredProducts, activeBanners] = await Promise.all([
        HomeService.getSections(),
        ProductService.getCategories(),
        ProductService.getFeaturedProducts(8),
        HomeService.getBanners(),
    ]);
    
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
            {/* Semantic SEO Foundation: Hidden from sight, visible to crawlers & screen readers */}
            <section className="sr-only">
                <h1>Root & Loom: The Premier Online Destination for Aesthetic Streetwear and Sustainable Fashion</h1>
                <p>
                    Root & Loom is a digital-first conscious fashion brand weaving traditional craftsmanship with modern Gen Z aesthetics. 
                    Specializing in oversized hoodies, premium graphic tees, and ethical denim, we bring &quot;Main Character Energy&quot; to every drop. 
                    Whether you&apos;re looking for Y2K revival styles, eco-friendly luxury, or the latest viral streetwear trends, our curated 
                    collections are loomed for the journey. Shop the best in sustainable luxury clothes, aesthetic drip, and ethical streetwear 
                    delivered with fast shipping across India.
                </p>
                <ul>
                    <li>Mens Streetwear & Aesthetic Clothing</li>
                    <li>Womens Sustainable Fashion & Ethical Luxury</li>
                    <li>Limited Edition Drops & Viral Fashion Trends</li>
                    <li>Y2K Style Revival & Modern Street Culture</li>
                </ul>
            </section>

            {!hasHeroSection && <HeroSection heroBanners={heroBanners} />}
            <HomeSectionRenderer sections={sections} data={data} />
            <FAQSection />
        </div>
    );
}
