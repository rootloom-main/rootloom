'use client';

import Link from 'next/link';
import { ProductCard } from '@/components/product/product-card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

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
        <section className="py-20 bg-white">
            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
                    <div className="max-w-2xl">
                        <span className="text-xs font-medium tracking-widest text-[#8c5a45] uppercase">Curated Collection</span>
                        <h2 className="text-3xl md:text-4xl font-serif text-slate-900 mt-2 mb-4">Featured Artifacts</h2>
                        <p className="text-slate-600 font-light leading-relaxed">
                            Handpicked selections representing the finest craftsmanship and timeless design.
                        </p>
                    </div>
                    <Button variant="outline" className="border-slate-800 text-slate-800 hover:bg-slate-900 hover:text-white rounded-none px-6 tracking-wide uppercase text-xs h-10 transition-all duration-300" asChild>
                        <Link href="/shop">
                            View All Collection
                        </Link>
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {products?.map((product) => (
                        <div key={product.id} className="group">
                            <ProductCard product={product} />
                        </div>
                    ))}
                </div>

                <div className="mt-16 text-center md:hidden">
                    <Button variant="outline" className="w-full border-slate-800 text-slate-800 hover:bg-slate-900 hover:text-white rounded-none uppercase text-xs h-11" asChild>
                        <Link href="/shop">
                            View All Collection
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}
