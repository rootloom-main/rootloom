import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { HeroSection } from '@/components/home/hero-section';
import { CategoryGrid } from '@/components/home/category-grid';
import { FeaturedProducts } from '@/components/home/featured-products';
import { NewArrivals } from '@/components/home/new-arrivals';
import { BestSellers } from '@/components/home/best-sellers';
import { AllProductsPreview } from '@/components/home/all-products-preview';
import { TrustSection } from '@/components/home/trust-section';
import { Loader2 } from 'lucide-react';

function SectionLoader() {
  return (
    <div className="py-20 flex justify-center items-center">
      <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
    </div>
  );
}

export default async function Home() {
  const supabase = await createClient();

  // Parallel data fetching for critical top-fold content
  const [categoriesResult, featuredProductsResult] = await Promise.all([
    supabase.from('categories').select('*').limit(4),
    supabase
      .from('products')
      .select('id, name, slug, base_price, product_images(image_url, alt_text)')
      .eq('featured', true)
      .limit(8),
  ]);

  const categories = categoriesResult.data || [];
  const featuredProducts = featuredProductsResult.data || [];

  return (
    <div>
      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Featured Products */}
      <FeaturedProducts products={featuredProducts} />

      {/* 3. Shop by Category */}
      <CategoryGrid categories={categories} />

      {/* 4. New Arrivals */}
      <Suspense fallback={<SectionLoader />}>
        <NewArrivals limit={8} />
      </Suspense>

      {/* 5. Best Sellers */}
      <Suspense fallback={<SectionLoader />}>
        <BestSellers limit={8} />
      </Suspense>

      {/* 6. Explore All Products */}
      <Suspense fallback={<SectionLoader />}>
        <AllProductsPreview limit={12} />
      </Suspense>

      {/* 8. Trust Indicators */}
      <TrustSection />
    </div>
  );
}

