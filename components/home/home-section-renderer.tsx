import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import SectionLoader from '@/components/home/section-loader';

// Import all components normally for stability and performance
import NewArrivals from '@/components/home/new-arrivals';
import BestSellers from '@/components/home/best-sellers';
import AllProductsPreview from '@/components/home/all-products-preview';
import HeroSection from '@/components/home/hero-section';
import CategoryGrid from '@/components/home/category-grid';
import FeaturedProducts from '@/components/home/featured-products';
import BrandStory from '@/components/home/brand-story';
import TrustSection from '@/components/home/trust-section';
import Newsletter from '@/components/home/newsletter-section';
import PromoBanner from '@/components/marketing/promo-banner';

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
                    case 'TESTIMONIALS':
                        return (
                            <section key={section.id} className="py-24 bg-heirloom-white">
                                <div className="container mx-auto px-6">
                                    <div className="text-center mb-16">
                                        <span className="text-xs font-bold tracking-[0.3em] text-raw-clay uppercase mb-3 block">{section.subtitle || 'Voices of Root & Loom'}</span>
                                        <h2 className="text-3xl md:text-5xl font-serif text-deep-forest">{section.title || 'What Our Community Says'}</h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        {(section.config?.items || []).map((testimonial: any, idx: number) => (
                                            <div key={idx} className="bg-stone-paper/30 p-8 rounded-2xl border border-stone-200/50 hover:shadow-xl transition-all duration-500 group">
                                                <div className="flex gap-1 mb-6">
                                                    {[...Array(5)].map((_, i) => (
                                                        <svg key={i} className={cn("w-4 h-4", i < (testimonial.rating || 5) ? "fill-raw-clay text-raw-clay" : "text-stone-300")} viewBox="0 0 20 20">
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                        </svg>
                                                    ))}
                                                </div>
                                                <p className="text-slate-bark italic mb-8 leading-relaxed">"{testimonial.content}"</p>
                                                <div className="flex items-center gap-4">
                                                    {testimonial.image ? (
                                                        <div className="h-10 w-10 rounded-full overflow-hidden border border-stone-200">
                                                            <Image src={testimonial.image} alt={testimonial.author} width={40} height={40} className="object-cover" />
                                                        </div>
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-full bg-raw-clay/10 flex items-center justify-center text-raw-clay font-bold text-xs">
                                                            {testimonial.author?.[0]}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <h4 className="font-bold text-sm text-deep-forest">{testimonial.author}</h4>
                                                        <p className="text-[10px] text-slate-bark uppercase tracking-widest">{testimonial.role || 'Verified Buyer'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
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
