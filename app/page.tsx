import { Suspense } from 'react';
import { createSSRClient as createClient } from '@/lib/utils/auth';
import { HeroSection } from '@/components/home/hero-section';
import { CategoryGrid } from '@/components/home/category-grid';
import { FeaturedProducts } from '@/components/home/featured-products';
import { NewArrivals } from '@/components/home/new-arrivals';
import { BestSellers } from '@/components/home/best-sellers';
import { AllProductsPreview } from '@/components/home/all-products-preview';
import { TrustSection } from '@/components/home/trust-section';
import { BrandStory } from '@/components/home/brand-story';
import { Newsletter } from '@/components/home/newsletter-section';
import { PromoBanner } from '@/components/marketing/promo-banner';
import { Loader2 } from 'lucide-react';
import { ProductGridSkeleton } from '@/components/product/product-skeleton';

function SectionLoader() {
  return (
    <div className="py-12">
      <ProductGridSkeleton count={4} />
    </div>
  );
}

export const revalidate = 3600; // Cache for 1 hour (Enterprise ISR)

export default async function Home() {
  const supabase = await createClient();

  // Parallel data fetching for critical top-fold content
  const [categoriesResult, featuredProductsResult, bannersResult] = await Promise.all([
    supabase.from('categories').select('*').limit(4),
    supabase
      .from('products')
      .select('id, name, slug, base_price, product_images(image_url, alt_text), product_variants(id, size, color, stock, price_adjustment)')
      .eq('featured', true)
      .limit(8),
    supabase
      .from('banners')
      .select('*')
      .eq('active', true),
  ]);

  const categories = categoriesResult.data || [];
  const featuredProducts = featuredProductsResult.data || [];
  const activeBanners = bannersResult.data || [];

  const heroBanners = activeBanners.filter((b: any) => b.position === 'hero');
  const topPromo = activeBanners.find((b: any) => b.position === 'promo_top');
  const bottomPromo = activeBanners.find((b: any) => b.position === 'promo_bottom');

  return (
    <div>
      {/* 1. Hero Section */}
      <HeroSection heroBanners={heroBanners} />

      {/* 1.5 Top Promo Banner */}
      <PromoBanner banner={topPromo} />

      {/* 2. Shop by Category */}
      <CategoryGrid categories={categories} />

      {/* 3. New Arrivals */}
      <Suspense fallback={<SectionLoader />}>
        <NewArrivals limit={8} />
      </Suspense>

      {/* 4. Best Sellers */}
      <Suspense fallback={<SectionLoader />}>
        <BestSellers limit={8} />
      </Suspense>

      {/* 5. Featured Products */}
      <FeaturedProducts products={featuredProducts} />

      {/* 6. Brand Story */}
      <BrandStory />

      {/* 7. Explore All Products */}
      <Suspense fallback={<SectionLoader />}>
        <AllProductsPreview limit={12} />
      </Suspense>

      {/* 7.5 Bottom Promo Banner */}
      <PromoBanner banner={bottomPromo} />

      {/* 8. Newsletter */}
      <Newsletter />

      {/* 9. Trust Indicators */}
      <TrustSection />
    </div>
  );
}

