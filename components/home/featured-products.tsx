'use client';

import Link from 'next/link';
import { ProductCard } from '@/components/product/product-card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { FadeIn, FadeInStagger, fadeInItemVariants } from '@/components/ui/fade-in';
import { motion } from 'framer-motion';

interface Product {
    id: string;
    name: string;
    slug: string;
    base_price: number;
    product_images: { image_url: string; alt_text: string }[];
}

interface FeaturedProductsProps {
    products: Product[];
}

export function FeaturedProducts({ products }: FeaturedProductsProps) {
    return (
        <section className="py-24 bg-white overflow-hidden">
            <div className="container mx-auto px-6">
                <FadeIn>
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
                        <div className="max-w-2xl">
                            <span className="text-xs font-bold tracking-[0.2em] text-raw-clay uppercase mb-3 block">Curated Collection</span>
                            <h2 className="text-4xl md:text-5xl font-serif text-deep-forest mb-4 leading-tight">Featured Artifacts</h2>
                            <p className="text-slate-600 font-light leading-relaxed text-lg max-w-xl">
                                Handpicked selections representing the finest craftsmanship and timeless design for the discerning individual.
                            </p>
                        </div>
                        <Button variant="outline" className="hidden md:flex border-deep-forest text-deep-forest hover:bg-deep-forest hover:text-heirloom-white rounded-full px-8 tracking-wide uppercase text-xs h-12 transition-all duration-300 group" asChild>
                            <Link href="/shop">
                                View Collection
                                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </Button>
                    </div>
                </FadeIn>

                <FadeInStagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
                    {products?.map((product) => (
                        <motion.div
                            key={product.id}
                            variants={fadeInItemVariants}
                            className="group"
                        >
                            <ProductCard product={product} />
                        </motion.div>
                    ))}
                </FadeInStagger>

                <div className="mt-16 text-center md:hidden">
                    <Button variant="outline" className="w-full border-deep-forest text-deep-forest hover:bg-deep-forest hover:text-heirloom-white rounded-full uppercase text-xs h-12 shadow-sm" asChild>
                        <Link href="/shop">
                            View All Collection
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}
