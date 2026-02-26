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
    viewAllText = "View All Collection",
    className,
    headerClassName
}: ProductShowcaseProps) {
    return (
        <section className={cn("py-20", className)}>
            <div className="container mx-auto px-6">
                <div className={cn("flex flex-col md:flex-row justify-between items-end mb-12 gap-4", headerClassName)}>
                    <div className="max-w-2xl">
                        {subtitle && (
                            <span className="text-xs font-medium tracking-widest text-[#8c5a45] uppercase mb-2 block">
                                {subtitle}
                            </span>
                        )}
                        <h2 className="text-3xl md:text-4xl font-serif text-slate-900 mb-4">
                            {title}
                        </h2>
                    </div>
                    <Button variant="outline" className="border-slate-800 text-slate-800 hover:bg-slate-900 hover:text-white rounded-none px-6 tracking-wide uppercase text-xs h-10 transition-all duration-300" asChild>
                        <Link href={viewAllLink}>
                            {viewAllText}
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
                        <Link href={viewAllLink}>
                            {viewAllText}
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}
