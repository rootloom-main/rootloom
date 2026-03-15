'use client';

import Link from 'next/link';
import { ProductCard } from '@/components/product/product-card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Product {
    id: string;
    name: string;
    slug: string;
    base_price: number;
    product_images: { image_url: string; alt_text: string | null }[];
    product_variants?: { id: string; size: string; color: string; stock: number; price_adjustment: number }[];
    // Add other fields as needed by ProductCard
    category?: { name: string };
}

interface ProductShowcaseProps {
    title: string;
    subtitle?: string;
    products: Product[];
    viewAllLink: string;
    viewAllText?: string;
    className?: string;
    headerClassName?: string;
}

export function ProductShowcase({
    title,
    subtitle,
    products,
    viewAllLink,
    viewAllText = "View All",
    className,
    headerClassName
}: ProductShowcaseProps) {
    return (
        <section className={cn("py-12 md:py-24", className)}>
            <div className="container mx-auto px-6">
                <div className={cn("flex justify-between items-end mb-8 md:mb-12 gap-4", headerClassName)}>
                    <div className="flex-1">
                        {subtitle && (
                            <span className="text-[10px] md:text-sm font-black tracking-[0.4em] text-[#ff00ff] uppercase mb-4 block drop-shadow-sm">
                                {subtitle}
                            </span>
                        )}
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">
                            {title}
                        </h2>
                    </div>
                    <Link
                        href={viewAllLink}
                        className="text-xs font-bold tracking-widest text-slate-900 uppercase border-b border-slate-900/20 pb-1 hover:border-slate-900 transition-all mb-1 shrink-0"
                    >
                        {viewAllText}
                    </Link>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                    {products?.map((product) => (
                        <div key={product.id} className="group">
                            <ProductCard product={product} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
