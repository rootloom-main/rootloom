import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { HeroSection } from '@/components/home/hero-section';
import { CategoryGrid } from '@/components/home/category-grid';
import { FeaturedProducts } from '@/components/home/featured-products';
import { NewArrivals } from '@/components/home/new-arrivals';
import { BestSellers } from '@/components/home/best-sellers';
import { AllProductsPreview } from '@/components/home/all-products-preview';
import BrandStory from '@/components/home/brand-story';
import TrustSection from '@/components/home/trust-section';
import Newsletter from '@/components/home/newsletter-section';

import { PromoBanner } from '@/components/marketing/promo-banner';
import { ProductGridSkeleton } from '@/components/product/product-skeleton';

function SectionLoader() {
    return (
        <div className="py-12">
            <ProductGridSkeleton count={4} />
        </div>
    );
}

interface HomeSectionRendererProps {
    sections: any[];
    data: {
        categories: any[];
        featuredProducts: any[];
        heroBanners: any[];
        topPromo?: any;
        bottomPromo?: any;
    };
}

export function HomeSectionRenderer({ sections, data }: HomeSectionRendererProps) {
    return (
        <>
            {sections.map((section) => {
                switch (section.type) {
                    case 'HERO':
                        return <HeroSection key={section.id} heroBanners={data.heroBanners} />;
                    case 'PROMO':
                        return <PromoBanner key={section.id} banner={data.topPromo} />;
                    case 'PROMO_BOTTOM':
                        return <PromoBanner key={section.id} banner={data.bottomPromo} />;
                    case 'CATEGORY_GRID':
                        return <CategoryGrid key={section.id} categories={data.categories} />;
                    case 'NEW_ARRIVALS':
                        return (
                            <Suspense key={section.id} fallback={<SectionLoader />}>
                                <NewArrivals limit={section.config?.limit || 8} />
                            </Suspense>
                        );
                    case 'BEST_SELLERS':
                        return (
                            <Suspense key={section.id} fallback={<SectionLoader />}>
                                <BestSellers limit={section.config?.limit || 8} />
                            </Suspense>
                        );
                    case 'FEATURED':
                        return <FeaturedProducts key={section.id} products={data.featuredProducts} />;
                    case 'ALL_PRODUCTS':
                        return (
                            <Suspense key={section.id} fallback={<SectionLoader />}>
                                <AllProductsPreview limit={section.config?.limit || 12} />
                            </Suspense>
                        );
                    case 'COLLECTION_GRID':
                        return (
                            <Suspense key={section.id} fallback={<SectionLoader />}>
                                <div className="py-12 md:py-20 bg-white">
                                    <div className="container mx-auto px-6">
                                        <div className="flex justify-between items-end mb-8 md:mb-12 gap-4">
                                            <div className="flex-1">
                                                <span className="text-[10px] font-bold tracking-[0.3em] text-raw-clay uppercase mb-2 block">{section.subtitle || 'Limited Time'}</span>
                                                <h2 className="text-2xl md:text-4xl font-serif text-deep-forest leading-tight">{section.title}</h2>
                                            </div>
                                            <Link
                                                href={`/collections/${section.config?.collection}`}
                                                className="text-xs font-bold tracking-widest text-deep-forest uppercase border-b border-deep-forest/20 pb-1 hover:border-deep-forest transition-all mb-1 shrink-0 group flex items-center gap-2"
                                            >
                                                Shop Collection
                                                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                                            </Link>
                                        </div>
                                        <NewArrivals limit={section.config?.limit || 8} category={section.config?.collection} />
                                    </div>
                                </div>
                            </Suspense>
                        );
                    case 'BRAND_STORY':
                        return <Suspense key={section.id} fallback={<SectionLoader />}><BrandStory /></Suspense>;
                    case 'NEWSLETTER':
                        return <Suspense key={section.id} fallback={<SectionLoader />}><Newsletter /></Suspense>;
                    case 'TRUST':
                        return <Suspense key={section.id} fallback={<SectionLoader />}><TrustSection /></Suspense>;
                    default:
                        return null;
                }
            })}
        </>
    );
}
