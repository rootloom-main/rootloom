import Link from 'next/link';
import { ProductCard } from '@/components/product/product-card';
import { ArrowRight } from 'lucide-react';

interface Product {
    id: string;
    name: string;
    slug: string;
    base_price: number;
    product_images: { image_url: string; alt_text: string | null }[];
    product_variants?: { id: string; size: string; color: string; stock: number; price_adjustment: number }[];
}

interface FeaturedProductsProps {
    products: Product[];
}

export default function FeaturedProducts({ products }: FeaturedProductsProps) {
    return (
        <section className="py-12 md:py-24 bg-white overflow-hidden">
            <div className="container mx-auto px-6">
                <div className="flex justify-between items-end mb-8 md:mb-12 gap-4">
                    <div className="flex-1">
                        <span className="text-[10px] font-bold tracking-[0.3em] text-raw-clay uppercase mb-2 block">Curated Collection</span>
                        <h2 className="text-2xl md:text-4xl font-serif text-deep-forest leading-tight">Featured Artifacts</h2>
                    </div>
                    <Link
                        href="/shop"
                        className="text-xs font-bold tracking-widest text-deep-forest uppercase border-b border-deep-forest/20 pb-1 hover:border-deep-forest transition-all mb-1 shrink-0 group flex items-center gap-2"
                    >
                        View Collection
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-10">
                    {products?.map((product, index) => (
                        <div
                            key={product.id}
                            className="group"
                        >
                            <ProductCard product={product} priority={index < 4} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
